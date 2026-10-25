import fs from "node:fs";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => { const [key, value] = arg.replace(/^--/, "").split("="); return [key, value]; }));
const date = args.date;
const period = args.period;
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !["daily", "weekly", "weekend"].includes(period)) { console.error("Usage: npm run verify:data -- --date=YYYY-MM-DD --period=daily|weekly|weekend"); process.exit(1); }
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) { const match = line.match(/^([A-Z0-9_]+)=(.*)$/); if (match && !process.env[match[1]]) process.env[match[1]] = match[2]; }
const url = process.env.SUPABASE_URL; const secret = process.env.SUPABASE_SECRET_KEY; const key = process.env.KOBIS_API_KEY;
if (!url || !secret || !key) { console.error("필요한 서버 환경 설정이 없습니다."); process.exit(1); }
async function rpc(name, body) { const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/${name}`, { method: "POST", headers: { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }); if (!response.ok) throw new Error(`Supabase ${response.status}`); return response.json(); }
function normalize(item) { return { movieCd: String(item.movieCd), movieNm: String(item.movieNm), openDt: item.openDt || null, rank: Number(item.rank), salesAmt: Number(item.salesAmt), audiCnt: Number(item.audiCnt), salesAcc: Number(item.salesAcc), audiAcc: Number(item.audiAcc) }; }
function endpoint() { const base = period === "daily" ? "searchDailyBoxOfficeList.json" : "searchWeeklyBoxOfficeList.json"; const params = new URLSearchParams({ key, targetDt: date.replaceAll("-", ""), itemPerPage: "10", multiMovieYn: "N", repNationCd: "K" }); if (period !== "daily") params.set("weekGb", period === "weekly" ? "0" : "1"); return `https://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/${base}?${params}`; }
try {
  const stored = await rpc("read_box_office_period", { p_period_type: period, p_target_date: date });
  if (!Array.isArray(stored) || stored.length === 0) { console.log("저장된 기간이 없습니다."); process.exit(2); }
  const savedItems = stored.filter((row) => row.rank !== null).map((row) => normalize({ movieCd: row.movie_code, movieNm: row.movie_name, openDt: row.open_date, rank: row.rank, salesAmt: row.sales_amt, audiCnt: row.audi_cnt, salesAcc: row.sales_acc, audiAcc: row.audi_acc }));
  const response = await fetch(endpoint()); if (!response.ok) throw new Error(`KOBIS ${response.status}`);
  const payload = await response.json(); const source = payload.boxOfficeResult?.dailyBoxOfficeList ?? payload.boxOfficeResult?.weeklyBoxOfficeList;
  if (!Array.isArray(source)) throw new Error("KOBIS response format invalid");
  const liveItems = source.map(normalize).sort((a,b) => a.rank-b.rank);
  const storedCanonical = JSON.stringify(savedItems.sort((a,b)=>a.rank-b.rank));
  const liveCanonical = JSON.stringify(liveItems);
  const sameAsStoredSnapshot = savedItems.every((item) => Object.values(item).every((value) => value !== undefined));
  const sameAsKobis = storedCanonical === liveCanonical;
  console.log(JSON.stringify({ storedSnapshot: sameAsStoredSnapshot ? "same" : "different", kobis: sameAsKobis ? "same" : "different", count: savedItems.length }, null, 2));
  process.exit(sameAsStoredSnapshot && sameAsKobis ? 0 : 1);
} catch (error) { console.error("검증 실패:", error instanceof Error ? error.message : "unknown error"); process.exit(1); }
