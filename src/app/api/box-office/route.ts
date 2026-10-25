import { NextResponse } from "next/server";
import { fetchKobisBoxOffice, KobisDataError, validateRequest } from "@/lib/kobis-box-office";
import { readBoxOfficePeriod, saveBoxOfficePeriod, storedRowsToItems, SupabaseDataError } from "@/lib/supabase-box-office";

export const runtime = "nodejs";

function failure(error: KobisDataError) {
  const status = error.kind === "invalid" ? 400 : error.kind === "timeout" ? 504 : error.kind === "config" ? 503 : 502;
  const code = error.kind === "invalid" ? "VALIDATION_ERROR" : error.kind === "timeout" ? "TIMEOUT" : error.kind === "config" ? "SERVICE_UNAVAILABLE" : "UPSTREAM_ERROR";
  return NextResponse.json({ error: { code, message: error.kind === "invalid" ? error.message : "박스오피스 정보를 불러오지 못했습니다." }, meta: { stale: false } }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  let input: ReturnType<typeof validateRequest>;
  try { input = validateRequest(url.searchParams.get("date"), url.searchParams.get("periodType")); }
  catch (error) { return failure(error instanceof KobisDataError ? error : new KobisDataError("invalid", "invalid request")); }
  try {
    const { date, periodType } = input;
    const requestStartedAt = new Date();
    let stored;
    try { stored = await readBoxOfficePeriod(periodType, date); }
    catch (error) { return failure(new KobisDataError("config", error instanceof SupabaseDataError ? "storage unavailable" : "storage read failed")); }
    const first = stored[0];
    if (first && new Date(first.expires_at).getTime() > Date.now()) {
      return NextResponse.json({ data: { items: storedRowsToItems(stored) }, meta: { periodType, targetDate: date, source: "database", stale: false, count: storedRowsToItems(stored).length, fetchedAt: first.fetched_at, expiresAt: first.expires_at } });
    }
    const items = await fetchKobisBoxOffice(date, periodType);
    const ttlHours = items.length === 0 ? 1 : 24;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
    try {
      const saved = await saveBoxOfficePeriod(periodType, date, items, requestStartedAt.toISOString(), expiresAt);
      if (saved.saved === false) {
        const newer = await readBoxOfficePeriod(periodType, date);
        const newerItems = storedRowsToItems(newer);
        return NextResponse.json({ data: { items: newerItems }, meta: { periodType, targetDate: date, source: "database", stale: false, count: newerItems.length } });
      }
    } catch (error) { return failure(new KobisDataError("config", error instanceof SupabaseDataError ? "storage unavailable" : "storage write failed")); }
    return NextResponse.json({ data: { items }, meta: { periodType, targetDate: date, source: "kobis", stale: false, count: items.length, expiresAt } });
  } catch (error) {
    const normalized = error instanceof KobisDataError ? error : new KobisDataError("upstream", "request failed");
    return failure(normalized.kind === "invalid" ? new KobisDataError("upstream", "KOBIS response format was invalid") : normalized);
  }
}
