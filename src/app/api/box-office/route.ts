import { NextResponse } from "next/server";
import { fetchKobisBoxOffice, KobisDataError, validateRequest } from "@/lib/kobis-box-office";

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
    const items = await fetchKobisBoxOffice(date, periodType);
    return NextResponse.json({ data: { items }, meta: { periodType, targetDate: date, source: "kobis", stale: false, count: items.length } });
  } catch (error) {
    const normalized = error instanceof KobisDataError ? error : new KobisDataError("upstream", "request failed");
    return failure(normalized.kind === "invalid" ? new KobisDataError("upstream", "KOBIS response format was invalid") : normalized);
  }
}
