"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { demoPeriod, getDemoBoxOffice } from "@/lib/demo-box-office";
import type { BoxOfficeRecord } from "@/lib/kobis-box-office";

type DayStatus = "pending" | "loading" | "success" | "empty" | "error";
type DayResult = { date: string; status: DayStatus; items: BoxOfficeRecord[]; error?: string };
const ranges = [7, 14, 30] as const;
const fmt = (value: number) => new Intl.NumberFormat("ko-KR").format(value);
const toDate = (daysAgo: number) => { const date = new Date(); date.setDate(date.getDate() - daysAgo); return date.toISOString().slice(0, 10); };
const dateList = (days: number, demo: boolean) => { if (demo) { const end = new Date(`${demoPeriod.end}T00:00:00Z`); return Array.from({ length: days }, (_, index) => { const date = new Date(end); date.setUTCDate(end.getUTCDate() - days + index + 1); return date.toISOString().slice(0, 10); }); } return Array.from({ length: days }, (_, index) => toDate(days - index - 1)); };
const toEok = (value: number) => `${(value / 100_000_000).toFixed(1)}억`;
const toThousand = (value: number) => `${(value / 1_000).toFixed(1)}천명`;

function sumObserved(days: DayResult[]) {
  const rows = days.flatMap((day) => day.items);
  const sales = rows.reduce((sum, row) => sum + row.salesAmt, 0);
  const audience = rows.reduce((sum, row) => sum + row.audiCnt, 0);
  const movies = new Map<string, { name: string; sales: number }>();
  for (const row of rows) { const current = movies.get(row.movieCd) ?? { name: row.movieNm, sales: 0 }; movies.set(row.movieCd, { name: current.name, sales: current.sales + row.salesAmt }); }
  return { sales, audience, movies: [...movies.entries()].map(([code, value]) => ({ code, ...value })).sort((a, b) => b.sales - a.sales).slice(0, 5) };
}

export function InsightsDashboard({ dataMode }: { dataMode: string }) {
  const [days, setDays] = useState<(typeof ranges)[number]>(7);
  const [results, setResults] = useState<DayResult[]>([]);
  const isDemo = dataMode === "demo";
  const loadDay = useCallback(async (date: string) => {
    if (isDemo) { const items = getDemoBoxOffice(date, "daily").map((item) => ({ movieCd: `demo-${item.movieName}`, movieNm: item.movieName, openDt: item.openDate, rank: item.rank, salesAmt: item.salesAmount, audiCnt: item.audienceCount, salesAcc: item.accumulatedAudience, audiAcc: item.accumulatedAudience })); return { date, status: items.length ? "success" as const : "empty" as const, items }; }
    const response = await fetch(`/api/box-office?date=${date}&periodType=daily`); const body = await response.json(); if (!response.ok) throw new Error(body.error?.message ?? "조회 실패"); return { date, status: body.data.items.length ? "success" as const : "empty" as const, items: body.data.items as BoxOfficeRecord[] };
  }, [isDemo]);
  const run = useCallback(async (targetDays = days, onlyDates?: string[]) => {
    const dates = onlyDates ?? dateList(targetDays, isDemo); setResults(dates.map((date) => ({ date, status: "pending", items: [] })));
    for (const date of dates) { setResults((current) => current.map((day) => day.date === date ? { ...day, status: "loading" } : day)); try { const result = await loadDay(date); setResults((current) => current.map((day) => day.date === date ? result : day)); } catch (error) { setResults((current) => current.map((day) => day.date === date ? { ...day, status: "error", error: error instanceof Error ? error.message : "조회 실패" } : day)); } }
  }, [loadDay, isDemo, days]);
  useEffect(() => { void run(days); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps
  const summary = useMemo(() => sumObserved(results), [results]);
  const completed = results.filter((day) => ["success", "empty", "error"].includes(day.status)).length;
  const validDays = results.length > 0 && results.every((day) => day.status === "success");
  const salesMax = Math.max(...results.map((day) => day.items.reduce((sum, item) => sum + item.salesAmt, 0)), 1);
  const verificationDays = results.filter((day) => day.status === "success").slice(0, 2);
  const statusCount = (status: DayStatus) => results.filter((day) => day.status === status).length;
  return <section className="insights-shell" aria-label="F2 인사이트">
    <div className="insights-heading"><div><p className="eyebrow">F2 · 인사이트</p><h2>일별 Top 10 관측 데이터 인사이트</h2><p>전체 통계가 아니라, 각 날짜의 일별 Top 10에 실제로 관측된 데이터만 집계합니다. 순위 밖 영화의 매출은 0으로 추정하지 않습니다.</p></div><label>조회 기간<select aria-label="인사이트 조회 기간" value={days} onChange={(e) => setDays(Number(e.target.value) as (typeof ranges)[number])}>{ranges.map((value) => <option key={value} value={value}>{value}일</option>)}</select></label></div>
    <div className="progress-panel"><div className="progress-title"><strong>날짜별 조회 진행률</strong><span>{completed}/{results.length || days}일 완료</span></div><progress value={completed} max={results.length || days} /><div className="status-counts"><span>정상 {statusCount("success")}</span><span>빈 날짜 {statusCount("empty")}</span><span>실패 {statusCount("error")}</span><span>조회 중 {statusCount("loading") + statusCount("pending")}</span></div>{results.some((day) => day.status === "error") && <button type="button" onClick={() => void run(days, results.filter((day) => day.status === "error").map((day) => day.date))}>실패한 날짜만 다시 시도</button>}</div>
    <div className="metric-grid"><article><span>관측 매출 합계</span><strong>{toEok(summary.sales)}</strong><small>일별 Top 10에 관측된 매출만 합산</small></article><article><span>관측 관객 합계</span><strong>{toThousand(summary.audience)}</strong><small>salesAcc·audiAcc는 합산하지 않음</small></article><article><span>관객당 매출</span><strong>{summary.audience > 0 ? `${fmt(Math.round(summary.sales / summary.audience))}원` : "—"}</strong><small>관측 매출 ÷ 관측 관객</small></article></div>
    <div className="chart-grid"><article className="chart-card"><h3>일별 Top 10 관측 매출 합계 추이</h3><p className="chart-note">정상 날짜만 점으로 표시하며 빈 날짜·실패 날짜는 선을 연결하지 않습니다.</p><div className="line-chart" aria-label="일별 관측 매출 합계"><div className="chart-bars">{results.map((day) => { const total = day.items.reduce((sum, item) => sum + item.salesAmt, 0); return <div className={`line-point ${day.status}`} key={day.date} title={`${day.date}: ${day.status === "success" ? total.toLocaleString() : day.status}`}><span style={{ height: `${day.status === "success" ? Math.max(6, total / salesMax * 100) : 0}%` }} /></div>; })}</div><div className="axis-labels">{results.filter((_, i) => i % Math.max(1, Math.floor(results.length / 6)) === 0).map((day) => <small key={day.date}>{day.date.slice(5)}</small>)}</div></div></article><article className="chart-card"><h3>기간 내 영화별 관측 매출 Top 5</h3><p className="chart-note">영화 코드(movieCd) 기준으로 묶고, Top 10 밖 영화는 포함하지 않습니다.</p><div className="bar-chart">{summary.movies.map((movie) => <div className="bar-row" key={movie.code}><span title={movie.code}>{movie.name}</span><div><i style={{ width: `${Math.max(4, movie.sales / (summary.movies[0]?.sales || 1) * 100)}%` }} /><b>{toEok(movie.sales)}</b></div></div>)}</div></article></div>
    <section className="data-rules"><h3>지표 계산에 포함·제외한 데이터</h3><table><thead><tr><th>구분</th><th>정책</th></tr></thead><tbody><tr><td>기간 자료</td><td>일별 응답만 사용하며 주간·주말 자료와 섞지 않음</td></tr><tr><td>영화 식별</td><td>영화명 대신 movieCd로 그룹화</td></tr><tr><td>누적 수치</td><td>salesAcc·audiAcc는 날짜별로 더하지 않음</td></tr><tr><td>관측 범위</td><td>Top 10 밖 영화 매출을 0으로 채우지 않음</td></tr><tr><td>빈 날짜·실패</td><td>차트 선을 끊고, 모든 날짜가 정상일 때만 기간 합계·순위를 신뢰</td></tr><tr><td>관객당 매출</td><td>관객 합계가 0 이하이면 “—” 표시</td></tr></tbody></table>{!validDays && results.length > 0 && <p className="warning">빈 날짜 또는 실패 날짜가 있어 기간 전체 순위는 확정하지 않습니다.</p>}</section>
    <section className="verification"><h3>두 날짜 손계산 대조</h3><p>화면 숫자는 합계를 먼저 계산한 뒤 마지막에 억원·천명 단위로 변환합니다.</p>{verificationDays.length === 0 ? <p>정상 날짜가 2개 이상이면 계산 과정을 표시합니다.</p> : <ol>{verificationDays.map((day) => { const sales = day.items.reduce((sum, item) => sum + item.salesAmt, 0); const audience = day.items.reduce((sum, item) => sum + item.audiCnt, 0); return <li key={day.date}><code>{day.date}</code>: Top {day.items.length}개 매출 {day.items.map((item) => item.salesAmt.toLocaleString()).join(" + ")} = <strong>{fmt(sales)}원 = {toEok(sales)}</strong>, 관객 {fmt(audience)}명</li>; })}</ol>}</section>
  </section>;
}
