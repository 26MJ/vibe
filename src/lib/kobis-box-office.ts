export type KobisPeriodType = "daily" | "weekly" | "weekend";

export type BoxOfficeRecord = {
  rank: number;
  movieCd: string;
  movieNm: string;
  openDt: string | null;
  salesAmt: number;
  audiCnt: number;
  salesAcc: number;
  audiAcc: number;
};

type RawItem = Record<string, unknown>;

function repairText(value: unknown) {
  const text = String(value ?? "");
  if (!/[ÃÂêìíîïë]/.test(text)) return text;
  try {
    const bytes = Array.from(text, (character) => `%${character.charCodeAt(0).toString(16).padStart(2, "0")}`).join("");
    return decodeURIComponent(bytes);
  } catch { return text; }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PERIODS = new Set<KobisPeriodType>(["daily", "weekly", "weekend"]);

export class KobisDataError extends Error {
  constructor(public readonly kind: "upstream" | "timeout" | "invalid" | "config", message: string) { super(message); }
}

export function validateRequest(date: string | null, periodType: string | null) {
  if (!date || !DATE_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) throw new KobisDataError("invalid", "date must be a valid YYYY-MM-DD value");
  if (!periodType || !PERIODS.has(periodType as KobisPeriodType)) throw new KobisDataError("invalid", "periodType must be daily, weekly, or weekend");
  return { date, periodType: periodType as KobisPeriodType };
}

function positiveInteger(value: unknown, field: string, minimum = 0) {
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) throw new KobisDataError("invalid", `${field} is not an integer`);
  const result = Number(text);
  if (!Number.isSafeInteger(result) || result < minimum) throw new KobisDataError("invalid", `${field} is out of range`);
  return result;
}

function optionalDate(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (text === "0" || text === "-" || text.toLowerCase() === "null") return null;
  if (!/^\d{8}$/.test(text)) throw new KobisDataError("invalid", "openDt has an invalid format");
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6)}`;
}

export function normalizeKobisItem(item: RawItem): BoxOfficeRecord {
  const movieCd = repairText(item.movieCd).trim();
  const movieNm = repairText(item.movieNm).trim();
  if (!movieCd || !movieNm) throw new KobisDataError("invalid", "required movie fields are missing");
  return { movieCd, movieNm, openDt: optionalDate(item.openDt), rank: positiveInteger(item.rank, "rank", 1), salesAmt: positiveInteger(item.salesAmt, "salesAmt"), audiCnt: positiveInteger(item.audiCnt, "audiCnt"), salesAcc: positiveInteger(item.salesAcc, "salesAcc"), audiAcc: positiveInteger(item.audiAcc, "audiAcc") };
}

export function normalizeKobisResponse(payload: unknown): BoxOfficeRecord[] {
  const result = payload && typeof payload === "object" ? (payload as { boxOfficeResult?: { dailyBoxOfficeList?: RawItem[]; weeklyBoxOfficeList?: RawItem[] } }).boxOfficeResult : undefined;
  const items = result?.dailyBoxOfficeList ?? result?.weeklyBoxOfficeList;
  if (!Array.isArray(items)) throw new KobisDataError("invalid", "boxOfficeResult list is missing");
  return items.map(normalizeKobisItem).sort((a, b) => a.rank - b.rank);
}

export async function fetchKobisBoxOffice(date: string, periodType: KobisPeriodType, apiKey = process.env.KOBIS_API_KEY) {
  if (!apiKey) throw new KobisDataError("config", "KOBIS API configuration is missing");
  const endpoint = periodType === "daily" ? "searchDailyBoxOfficeList.json" : "searchWeeklyBoxOfficeList.json";
  const params = new URLSearchParams({ key: apiKey, targetDt: date.replaceAll("-", ""), itemPerPage: "10", multiMovieYn: "N", repNationCd: "K" });
  if (periodType !== "daily") params.set("weekGb", periodType === "weekly" ? "0" : "1");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`https://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/${endpoint}?${params}`, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) throw new KobisDataError("upstream", "KOBIS returned a non-success status");
    let payload: unknown;
    try { payload = await response.json(); } catch { throw new KobisDataError("invalid", "KOBIS returned invalid JSON"); }
    return normalizeKobisResponse(payload);
  } catch (error) {
    if (error instanceof KobisDataError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new KobisDataError("timeout", "KOBIS request timed out");
    throw new KobisDataError("upstream", "KOBIS request failed");
  } finally { clearTimeout(timer); }
}
