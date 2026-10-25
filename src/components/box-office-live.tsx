"use client";

import { useEffect, useState } from "react";
import type { KobisPeriodType, BoxOfficeRecord } from "@/lib/kobis-box-office";

export function BoxOfficeLive() {
  const [date, setDate] = useState("2026-09-06");
  const [periodType, setPeriodType] = useState<KobisPeriodType>("daily");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [items, setItems] = useState<BoxOfficeRecord[]>([]);
  const [message, setMessage] = useState("");
  async function load(nextDate = date, nextPeriod = periodType) {
    setState("loading");
    try {
      const response = await fetch(`/api/box-office?date=${nextDate}&periodType=${nextPeriod}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "요청에 실패했습니다.");
      setItems(body.data.items); setMessage(""); setState("success");
    } catch (error) { setItems([]); setMessage(error instanceof Error ? error.message : "요청에 실패했습니다."); setState("error"); }
  }
  useEffect(() => { void load(); }, []);
  return <main className="dashboard-shell"><header className="dashboard-header"><p className="eyebrow">F1 · 박스오피스 목록</p><h1>영화 박스오피스 인사이트</h1><p>KOBIS Open API 실시간 조회</p><span className="mode-badge">DATA_MODE: live</span></header>
    <section className="filters" aria-label="박스오피스 조회 조건"><label>조회 날짜<input aria-label="조회 날짜" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><label>기간 유형<select aria-label="기간 유형" value={periodType} onChange={(e) => setPeriodType(e.target.value as KobisPeriodType)}><option value="daily">일간</option><option value="weekly">주간</option><option value="weekend">주말</option></select></label><button type="button" onClick={() => void load()}>조회</button></section>
    {state === "loading" && <section className="status-panel loading" aria-live="polite"><h2>박스오피스 정보를 불러오는 중입니다.</h2></section>}
    {state === "error" && <section className="status-panel error" role="alert"><h2>박스오피스 정보를 불러오지 못했습니다.</h2><p>{message}</p><button type="button" onClick={() => void load()}>재시도</button></section>}
    {state === "success" && items.length === 0 && <section className="status-panel empty"><h2>해당 기간의 데이터가 없습니다.</h2><p>오류가 아니라 KOBIS가 반환한 정상적인 빈 결과입니다.</p></section>}
    {state === "success" && items.length > 0 && <section className="table-card"><div className="table-heading"><h2>{date} {periodType} 박스오피스</h2><span>조회 건수 {items.length}건 · 출처 KOBIS · 수집 시각 {new Date().toLocaleString("ko-KR")}</span></div><div className="table-scroll"><table><thead><tr><th>순위</th><th>영화명</th><th>개봉일</th><th>매출</th><th>관객 수</th><th>누적 관객 수</th></tr></thead><tbody>{items.map((item) => <tr key={item.movieCd}><td>{item.rank}</td><td>{item.movieNm}</td><td>{item.openDt ?? "-"}</td><td>{item.salesAmt.toLocaleString("ko-KR")}원</td><td>{item.audiCnt.toLocaleString("ko-KR")}명</td><td>{item.audiAcc.toLocaleString("ko-KR")}명</td></tr>)}</tbody></table></div></section>}
  </main>;
}
