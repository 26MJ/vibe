# 아키텍처: 영화 박스오피스 인사이트 대시보드

## 1. 목적과 범위

이 문서는 KOBIS 박스오피스 API의 일간·주간·주말 데이터를 이용해 목록과 인사이트를 제공하는 서비스의 구성과 데이터 처리 규칙을 정의한다. API 키와 DB 비밀 값은 서버에만 두며, 브라우저는 내부 API만 호출한다.

## 2. 최종 구성

| 계층 | 구성 요소 | 책임 |
| --- | --- | --- |
| 프런트엔드 | Next.js App Router, TypeScript | 목록(F1), 인사이트(F2), 날짜·기간 유형·영화명 검색 UI, 차트와 상태 안내 렌더링 |
| 내부 API | Next.js Route Handlers | 입력 검증, 캐시 조회·갱신, KOBIS 호출, 응답 정규화와 오류 분류 |
| 데이터 저장소 | Supabase Postgres | 조회 단위별 캐시와 캐시 생성·만료 시각 저장 |
| 외부 데이터 | KOBIS 박스오피스 API | 일간·주간·주말 박스오피스 원천 데이터 제공 |
| 배포 | Vercel | Next.js 애플리케이션과 서버 API 배포, 서버 환경 변수 관리 |

## 3. 데이터 계약

### KOBIS 호출 주소

모든 호출은 서버 Route Handler에서만 수행하며, `key` 값은 환경 변수 `KOBIS_API_KEY`로 주입한다. 다음 주소의 `[API_KEY]`, `[YYYYMMDD]`는 실제 값으로 치환한다.

| 조회 유형 | KOBIS REST API 주소 | 주요 쿼리 |
| --- | --- | --- |
| 일간 | `https://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json?key=[API_KEY]&targetDt=[YYYYMMDD]` | `targetDt`: 조회일 |
| 주간 | `https://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchWeeklyBoxOfficeList.json?key=[API_KEY]&targetDt=[YYYYMMDD]&weekGb=0` | `targetDt`: 기준일, `weekGb=0`: 주간(월~일) |
| 주말 | `https://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchWeeklyBoxOfficeList.json?key=[API_KEY]&targetDt=[YYYYMMDD]&weekGb=1` | `targetDt`: 기준일, `weekGb=1`: 주말(금~일) |

KOBIS는 주간·주말을 동일한 주간 박스오피스 엔드포인트에서 `weekGb` 값으로 구분한다. 브라우저에는 위 URL이나 API 키를 전달하지 않는다.

KOBIS 응답의 다음 필드를 사용한다. 숫자처럼 보이는 값도 문자열로 도착하므로, 내부 API에서 변환과 검증을 마친 숫자 값을 저장·집계한다.

| KOBIS 필드 | 내부 타입 | 설명 |
| --- | --- | --- |
| `movieCd` | string | 영화 식별 코드 |
| `movieNm` | string | 영화명 |
| `rank` | number | 해당 조회 기간의 순위 |
| `openDt` | string \| null | 개봉일 (`YYYY-MM-DD`로 정규화, 미제공 시 `null`) |
| `salesAmt` | number | 해당 기간 매출액(원) |
| `audiCnt` | number | 해당 기간 관객 수(명) |
| `salesAcc` | number | 누적 매출액(원) |
| `audiAcc` | number | 누적 관객 수(명) |

변환할 수 없는 숫자 문자열, 음수, 필수 식별자·영화명이 없는 레코드는 저장 및 응답에서 제외하고 서버 로그에 원인을 기록한다. API 키, DB 비밀키, 원본 요청 URL의 인증 정보는 로그에 남기지 않는다.

## 4. 캐시 모델

캐시 키는 `periodType + targetDate`로 구성한다. `periodType`은 `daily`, `weekly`, `weekend` 중 하나이며 `targetDate`는 API 조회 기준 날짜다. 캐시 레코드에는 최소한 다음을 보관한다.

| 필드 | 설명 |
| --- | --- |
| `cache_key` | 기간 유형과 조회 날짜를 합친 고유 키 |
| `period_type` | `daily` / `weekly` / `weekend` |
| `target_date` | 조회 기준 날짜 |
| `items` | 정규화한 박스오피스 영화 목록(JSONB 또는 별도 상세 테이블) |
| `fetched_at` | KOBIS에서 성공적으로 가져온 시각 |
| `expires_at` | 캐시 만료 시각 |

기본 TTL은 과도한 외부 호출을 줄이면서 최신성을 유지하도록 일간 데이터는 다음날 갱신 시점까지, 주간·주말 데이터는 최소 6시간으로 둔다. 실제 값은 환경 변수로 조정 가능하게 한다. 인사이트는 저장된 캐시 데이터를 집계해 생성하며, 최근 7·14·30일 구간에 필요한 일간 캐시가 없으면 내부 API가 해당 일자를 채운 뒤 집계한다.

## 5. 처리 흐름

`브라우저 → Next.js 내부 API → Supabase(Postgres) 캐시 조회 → (캐시 미스/만료 시) KOBIS 박스오피스 API → 서버 정규화·캐시 저장 → 내부 API 응답 → 브라우저`

브라우저는 검색어로 이미 받은 목록을 필터링할 수 있으며, API 키를 전달하거나 KOBIS를 직접 호출하지 않는다.

## 6. 캐시 및 외부 API 처리 정책

| 상황 | 서버 처리 | 브라우저 응답 및 안내 |
| --- | --- | --- |
| 유효한 캐시가 있을 때 | 캐시된 정규화 데이터를 즉시 반환한다. KOBIS를 호출하지 않는다. | `200`과 목록 또는 인사이트를 표시한다. |
| 캐시가 없거나 만료됐을 때 | KOBIS를 호출한다. 성공하면 숫자 문자열을 숫자로 변환·검증하고 캐시를 upsert한 뒤 반환한다. | `200`과 최신 데이터를 표시한다. 로딩 상태를 잠시 보여준다. |
| 외부 API가 실패했을 때 | 만료된 마지막 정상 캐시가 있으면 `stale: true`와 함께 반환한다. 캐시도 없으면 오류를 기록하고 실패 응답을 반환한다. | 오래된 데이터가 있으면 "최신 정보를 불러오지 못해 이전 데이터를 보여드립니다"와 재시도를 표시한다. 데이터가 없으면 "박스오피스 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."와 재시도를 표시한다. |
| 정상 빈 응답일 때 | 빈 배열을 정상 결과로 캐시한다. 외부 API 오류로 간주하지 않는다. | `200`과 빈 상태 "선택한 조건의 박스오피스 데이터가 아직 없습니다."를 표시하고 다른 날짜 선택 수단을 제공한다. |

## 7. API 경계와 입력 검증

- 목록 API 예시: `GET /api/box-office?date=YYYY-MM-DD&periodType=daily|weekly|weekend`
- 인사이트 API 예시: `GET /api/insights?days=7|14|30&top=5|10`
- 날짜는 유효한 `YYYY-MM-DD`여야 하고, 지원하지 않는 `periodType`, `days`, `top` 값은 `400`으로 거절한다.
- KOBIS 호출 실패로 캐시를 만들지 못한 경우에는 `502` 또는 서비스 정책상 `503`을 반환한다. 만료 캐시를 반환하는 경우에는 성공 응답에 `stale: true`를 포함한다.
- 영화명 검색 결과 없음은 서버 오류가 아닌 UI의 정상 빈 상태로 처리한다.

## 8. 보안 및 운영

- `KOBIS_API_KEY`, `SUPABASE_URL`, 서버 전용 Supabase 키는 Vercel 환경 변수에만 설정한다. 서버 전용 키에는 `NEXT_PUBLIC_` 접두어를 사용하지 않는다.
- Supabase의 공개 클라이언트 키가 필요한 경우에도 RLS 정책으로 공개 범위를 제한하고, 관리자 권한 키는 Route Handler에서만 사용한다.
- Vercel Hobby와 Supabase Free의 요청·대역폭·DB 용량·휴면 정책을 배포 전에 검토한다.
- 외부 API 실패율, 캐시 적중률, 응답 지연, 데이터 정규화 실패 건수를 민감 정보 없이 관찰한다.
