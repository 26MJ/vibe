# PRD 인수 기준 점검 결과

점검 기준: `PRD.md` 7장 AC 1~10. 실행한 명령은 `package.json`에 실제 등록된 scripts만 사용했다. 비밀값은 기록하지 않았다.

## 전체 요약

| AC | 결과 | 환경 |
|---:|---|---|
| 1 | 통과 | demo + Playwright E2E |
| 2 | 통과 | demo + Playwright E2E |
| 3 | 통과 | fixture 단위 테스트 + 코드 검사 |
| 4 | 통과 | demo + Playwright E2E |
| 5 | 통과 | demo + Playwright E2E |
| 6 | 통과 | demo + Playwright E2E |
| 7 | 통과 | demo + Playwright E2E; 실제 KOBIS 실패 상태는 live에서 재현 |
| 8 | 미실행 | F2 시각·실제 수치의 별도 브라우저 대조 테스트 없음 |
| 9 | 통과 | 코드·빌드·환경 파일 검사 |
| 10 | 미실행 | Vercel/Supabase Free 실제 배포 조건은 확인하지 않음 |

## AC별 확인

### AC1 — 유효한 기간·기간 유형 조회

- 확인: `npm run test:e2e -- --reporter=line`을 `DATA_MODE=demo`로 실행.
- 결과: 통과. `2026-09-07` 일간 조회에서 목록이 표시되고, 날짜·기간 유형 컨트롤이 동작했다.
- 환경: demo fixture. 실제 DB/KOBIS 결과로 간주하지 않는다.

### AC2 — 목록 필수 필드

- 확인: 같은 E2E에서 목록 테이블과 영화명·순위·개봉일·매출·관객 수·누적 관객 수 셀을 확인.
- 결과: 통과.
- 환경: demo fixture.

### AC3 — 숫자 변환·정렬·필수 필드

- 확인: `npm test -- --run` 실행. KOBIS 문자열 숫자 fixture 테스트 3개가 통과했고, `npm run typecheck`, `npm run build`도 통과.
- 별도 손계산(2026-09-07 demo): `120,000,000 + 89,000,000 + 55,000,000 = 264,000,000원`; 관객 `12,000 + 8,900 + 5,500 = 26,400명`.
- 결과: 통과(정적 fixture/정규화 범위). 실제 KOBIS 원본 전체 표본의 통계 검증은 미실행.
- 환경: fixture/mock.

### AC4 — 영화명 검색 일치

- 확인: E2E에서 `바다` 검색 후 `바다의 노래` 셀 확인.
- 결과: 통과.
- 환경: demo.

### AC5 — 검색 결과 없음 상태

- 확인: E2E에서 `없는 제목` 검색 후 `검색 결과가 없습니다.` 안내 확인.
- 결과: 통과.
- 환경: demo.

### AC6 — 정상 빈 결과 상태

- 확인: E2E에서 `2026-09-06` 선택 후 `해당 기간의 박스오피스 데이터가 없습니다.` 확인.
- 결과: 통과. 빈 결과를 오류와 다른 화면으로 표시한다.
- 환경: demo fixture.

### AC7 — KOBIS/서버 실패와 재시도

- 확인: E2E에서 demo 상태를 `로딩`, `오류`로 바꾸고 각각의 상태 화면·오류 안내를 확인.
- 실제 live 재현: `DATA_MODE=live` 서버에서 `GET /api/box-office?date=2026-09-06&periodType=daily` 호출 시 Supabase RPC가 준비되지 않은 상태에서 `503 SERVICE_UNAVAILABLE`을 확인했고, `npm run verify:data -- --date=2026-09-06 --period=daily`는 `Supabase 404`, 종료 코드 `1`이었다.
- 결과: 통과. 실패 상황에서 성공 데이터로 위장하지 않고 오류 안내를 보여준다. Supabase를 실제로 준비한 뒤의 live 저장 실패·KOBIS 실패 분기 비교는 별도 미실행.
- 환경: demo + 실제 live 서버(설정 오류 재현).

### AC8 — F2 최근 7/14/30일 인사이트

- 구현 확인: F2에 최근 7/14/30일 선택, 날짜별 진행률, 정상·빈 날짜·실패·조회 중 개수, 실패 날짜 재시도, Top 10 관측 매출 추이, movieCd 기준 Top 5, 보조 수치가 포함되어 있다. `npm run typecheck`와 `npm run build` 통과.
- 손계산 대조값(독립 계산):

| 날짜 | 매출 계산 | 기대 매출 | 관객 계산 | 기대 관객 |
|---|---|---:|---|---:|
| 2026-09-07 | 120,000,000 + 89,000,000 + 55,000,000 | 264,000,000원 (2.64억) | 12,000 + 8,900 + 5,500 | 26,400명 (26.4천명) |
| 2026-09-08 | 120,000,000 + 89,000,000 + 55,000,000 | 264,000,000원 (2.64억) | 12,000 + 8,900 + 5,500 | 26,400명 (26.4천명) |

기간 7일 기대 합계는 매출 `1,848,000,000원(18.48억)`, 관객 `184,800명(184.8천명)`, 관객당 매출 `10,000원`이다. 이 값은 demo fixture의 세 영화 일별 관측값을 손으로 합산한 값이며, 누적 수치는 더하지 않았다.

- 결과: 미실행. F2 브라우저에서 위 숫자를 실제 DOM에서 읽어 나란히 비교하는 전용 테스트는 아직 추가하지 않았다.
- 환경: 구현은 demo/live 양쪽 경로를 지원하지만, 이번 AC 판정은 typecheck/build까지만 확인.

### AC9 — 키·DB 정보 비노출

- 확인: 코드상 KOBIS/Supabase 값은 서버 Route Handler와 server-only RPC 모듈에서만 읽는다. 브라우저 응답에는 키를 넣지 않는다. `npm run build` 통과.
- 결과: 통과. 실제 배포 로그·브라우저 DevTools 네트워크의 비밀값 검사는 미실행.
- 환경: 코드 검사 + 로컬 build.

### AC10 — 배포 및 무료 조건

- 확인: `npm run build` 통과.
- 결과: 미실행. Vercel Hobby와 Supabase Free의 실제 배포·쿼터·자동 중지 조건은 이 환경에서 확인하지 않았다.
- 환경: 로컬 build만 확인.

## 실행 명령 결과

| 명령 | 결과 |
|---|---|
| `npm test -- --run` | 통과, 3 tests passed |
| `npm run lint` | 통과 |
| `npm run typecheck` | 통과 |
| `npm run build` | 통과 |
| `npm run test:e2e -- --reporter=line` (`DATA_MODE=demo`) | 통과, 1 passed |
| `npm run verify:data -- --date=2026-09-06 --period=daily` | 실패 재현, Supabase 404, exit 1 |

초기 lint 실패는 React effect 구조와 E2E의 기존 단일 table selector에서 발생했다. 기능을 변경하지 않고 `useCallback`/effect 의존성을 정리하고, F2 추가로 두 개가 된 table을 `.first()`로 선택하도록 테스트 구조를 정리했다. 이후 `test`, `lint`, `typecheck`, `build`, demo E2E를 모두 다시 실행해 통과시켰다.
