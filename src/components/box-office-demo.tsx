"use client";

import { useMemo, useState } from "react";
import { demoPeriod, getDemoBoxOffice, type PeriodType } from "@/lib/demo-box-office";

type DemoState = "auto" | "loading" | "error";
const labels: Record<PeriodType, string> = { daily: "일간", weekly: "주간", weekend: "주말" };
const number = (v: number) => new Intl.NumberFormat("ko-KR").format(v);

export function BoxOfficeDemo({ dataMode }: { dataMode: string }) {
  const [date, setDate] = useState<string>(demoPeriod.start);
  const [periodType, setPeriodType] = useState<PeriodType>("daily");
  const [query, setQuery] = useState("");
  const [demoState, setDemoState] = useState<DemoState>("auto");
  const isDemo = dataMode === "demo";
  const records = useMemo(() => isDemo ? getDemoBoxOffice(date, periodType) : [], [date, periodType, isDemo]);
  const filtered = records.filter((r) => r.movieName.includes(query.trim()));
  const loading = isDemo && demoState === "loading";
  const error = !isDemo || demoState === "error";
  const empty = !error && !loading && records.length === 0;
  const noSearch = !error && !loading && records.length > 0 && filtered.length === 0;
  const collectedAt = date === demoPeriod.start ? "2026-09-06 23:59" : "2026-09-14 06:00";
  const reset = () => { setDate(demoPeriod.start); setPeriodType("daily"); setQuery(""); setDemoState("auto"); };
  return <main className="dashboard-shell">
    <header className="dashboard-header"><p className="eyebrow">F1 · 박스오피스 목록</p><h1>영화 박스오피스 인사이트</h1><p>날짜와 기간 유형을 선택해 영화별 순위·매출·관객 수를 확인하세요.</p><span className="mode-badge">DATA_MODE: {dataMode}</span></header>
    <section className="filters" aria-label="박스오피스 조회 조건"><label>조회 날짜<input aria-label="조회 날짜" type="date" value={date} onChange={(e) => { setDate(e.target.value); setDemoState("auto"); }} /></label><label>기간 유형<select aria-label="기간 유형" value={periodType} onChange={(e) => { setPeriodType(e.target.value as PeriodType); setDemoState("auto"); }}>{Object.entries(labels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label><label>영화명 검색<input aria-label="영화명 검색" type="search" placeholder="예: 바다" value={query} onChange={(e) => setQuery(e.target.value)} /></label></section>
    <section className="demo-controls" aria-label="demo 상태 제어"><label>demo 상태<select aria-label="demo 상태" value={demoState} onChange={(e) => setDemoState(e.target.value as DemoState)}><option value="auto">자동 (성공 또는 빈 결과)</option><option value="loading">로딩</option><option value="error">오류</option></select></label><p>DATA_MODE=demo에서는 외부 API 대신 고정 fixture로 상태를 확인합니다.</p></section>
    {error && <section className="status-panel error" role="alert"><h2>박스오피스 정보를 불러오지 못했습니다.</h2><p>{isDemo ? "demo 오류 상태입니다. 재시도하면 정상 상태로 돌아갑니다." : "현재 live 모드는 연결되지 않았습니다."}</p><button type="button" onClick={() => setDemoState("auto")}>재시도</button></section>}
    {loading && <section className="status-panel loading" aria-live="polite"><h2>박스오피스 정보를 불러오는 중입니다.</h2><p>잠시만 기다려 주세요.</p></section>}
    {empty && <section className="status-panel empty"><h2>해당 기간의 박스오피스 데이터가 없습니다.</h2><p>오류가 아니라, 선택한 날짜에 제공할 데이터가 없는 정상적인 빈 결과입니다. 다른 날짜를 선택해 보세요.</p><button type="button" onClick={reset}>demo 시작 조건으로 돌아가기</button></section>}
    {noSearch && <section className="status-panel no-results"><h2>&apos;{query.trim()}&apos; 검색 결과가 없습니다.</h2><p>조회 데이터는 정상적으로 불러왔지만, 해당 영화명이 포함된 결과가 없습니다. 검색어를 바꿔 보세요.</p><button type="button" onClick={() => setQuery("")}>검색어 지우기</button></section>}
    {!error && !loading && !empty && !noSearch && <section className="table-card" aria-label="박스오피스 목록"><div className="table-heading"><div><h2>{date} {labels[periodType]} 박스오피스</h2><div className="metadata"><span>조회 건수 <strong>{filtered.length}건</strong></span><span>출처 <strong>demo fixture</strong></span><span>수집 시각 <strong>{collectedAt}</strong></span></div></div><span>{query.trim() ? `검색 결과 ${filtered.length}건` : "전체 결과"}</span></div><div className="table-scroll"><table><thead><tr><th>순위</th><th>영화명</th><th>개봉일</th><th>매출</th><th>관객 수</th><th>누적 관객 수</th></tr></thead><tbody>{filtered.map((r) => <tr key={r.movieName}><td>{r.rank}</td><td>{r.movieName}</td><td>{r.openDate}</td><td>{number(r.salesAmount)}원</td><td>{number(r.audienceCount)}명</td><td>{number(r.accumulatedAudience)}명</td></tr>)}</tbody></table></div></section>}
    <aside className="state-guide" aria-label="상태 확인 안내"><h2>상태 확인 방법</h2><ul><li><strong>성공:</strong> 2026-09-07 · 일간 · 자동</li><li><strong>빈 결과:</strong> 2026-09-06 · 일간 · 자동</li><li><strong>검색 결과 있음:</strong> 2026-09-07에서 <code>바다</code> 입력</li><li><strong>검색 결과 없음:</strong> 2026-09-07에서 없는 제목 입력</li><li><strong>로딩/오류:</strong> demo 상태를 각각 선택</li></ul></aside>
  </main>;
}
