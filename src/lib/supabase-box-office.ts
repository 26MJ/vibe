import type { BoxOfficeRecord, KobisPeriodType } from "@/lib/kobis-box-office";

export class SupabaseDataError extends Error {}
type StoredRow = { period_type: string; target_date: string; fetched_at: string; expires_at: string; rank: number | null; movie_code: string | null; movie_name: string | null; open_date: string | null; sales_amt: number | string | null; audi_cnt: number | string | null; sales_acc: number | string | null; audi_acc: number | string | null };

function config() { const url=process.env.SUPABASE_URL; const key=process.env.SUPABASE_SECRET_KEY; if (!url || !key) throw new SupabaseDataError("Supabase configuration is missing"); return { url: url.replace(/\/$/, ""), key }; }
async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> { const {url,key}=config(); const response=await fetch(`${url}/rest/v1/rpc/${name}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store"}); if(!response.ok) throw new SupabaseDataError("Supabase request failed"); return await response.json() as T; }
export async function readBoxOfficePeriod(periodType: KobisPeriodType, date: string) { return rpc<StoredRow[]>("read_box_office_period",{p_period_type:periodType,p_target_date:date}); }
export async function saveBoxOfficePeriod(periodType: KobisPeriodType, date: string, items: BoxOfficeRecord[], fetchedAt: string, expiresAt: string) { return rpc<{saved:boolean}>("save_box_office_period",{p_period_type:periodType,p_target_date:date,p_items:items,p_fetched_at:fetchedAt,p_expires_at:expiresAt}); }
export function storedRowsToItems(rows: StoredRow[]): BoxOfficeRecord[] { return rows.filter((r)=>r.rank!==null&&r.movie_code&&r.movie_name).map((r)=>({rank:Number(r.rank),movieCd:r.movie_code!,movieNm:r.movie_name!,openDt:r.open_date,salesAmt:Number(r.sales_amt),audiCnt:Number(r.audi_cnt),salesAcc:Number(r.sales_acc),audiAcc:Number(r.audi_acc)})); }
