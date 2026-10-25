# KOBIS Open API 연동 가이드 (A단계)

공식 제공서비스: [KOBIS Open API](https://www.kobis.or.kr/kobisopenapi/homepg/main/main.do)의 일별 박스오피스 및 주간/주말 박스오피스. 이번 단계는 `KOBIS 호출 → 응답 검증·정규화 → 내부 API 응답`까지만 구현한다. DB 저장과 캐시는 B단계에서 추가한다.

## 1. 요청과 응답

내부 API는 `GET /api/box-office?date=YYYY-MM-DD&periodType=daily|weekly|weekend`다. 브라우저는 이 내부 API만 호출하며 KOBIS URL과 인증키는 서버에서만 구성한다.

| 기간 | KOBIS 경로 | 요청 파라미터 | 응답 목록 |
|---|---|---|---|
| 일간 | `/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json` | `key`(서버 환경변수), `targetDt=YYYYMMDD`, `itemPerPage=10`, `multiMovieYn=N`, `repNationCd=K` | `boxOfficeResult.dailyBoxOfficeList` |
| 주간 | `/kobisopenapi/webservice/rest/boxoffice/searchWeeklyBoxOfficeList.json` | 위 공통 파라미터 + `weekGb=0` | `boxOfficeResult.weeklyBoxOfficeList` |
| 주말 | 같은 주간 경로 | 위 공통 파라미터 + `weekGb=1` | `boxOfficeResult.weeklyBoxOfficeList` |

KOBIS 원본은 JSON의 `boxOfficeResult` 아래 목록을 반환하며, 숫자처럼 보이는 값도 문자열일 수 있다. 내부 API 성공 응답은 `{ data: { items: [...] }, meta: { periodType, targetDate, source: "kobis", stale: false, count } }`로 정규화한다. 인증키는 응답·로그·문서에 기록하지 않는다.

## 2. ERD 컬럼 매핑과 타입 변환

| KOBIS 필드 | 내부 응답 필드 | ERD 컬럼 | 변환·검증 |
|---|---|---|---|
| `movieCd` | `movieCd` | `movies.movie_code` | trim 후 비어 있지 않은 문자열, 최대 20자 |
| `movieNm` | `movieNm` | `movies.movie_name` | trim 후 비어 있지 않은 문자열, 최대 255자 |
| `openDt` | `openDt` | `movies.open_date` | `YYYYMMDD`를 `YYYY-MM-DD`로 변환; 빈 값은 `null` |
| `rank` | `rank` | `box_office_performances.rank` | 문자열을 안전한 정수로 변환, `>= 1` |
| `salesAmt` | `salesAmt` | `sales_amt` | 문자열을 안전한 정수로 변환, `>= 0`, BIGINT 범위 |
| `audiCnt` | `audiCnt` | `audi_cnt` | 문자열을 안전한 정수로 변환, `>= 0`, BIGINT 범위 |
| `salesAcc` | `salesAcc` | `sales_acc` | 문자열을 안전한 정수로 변환, `>= 0`, BIGINT 범위 |
| `audiAcc` | `audiAcc` | `audi_acc` | 문자열을 안전한 정수로 변환, `>= 0`, BIGINT 범위 |

현재 A단계에서는 DB 컬럼에 쓰지 않고 위 ERD 타입과 같은 형태의 숫자형 JSON으로 반환한다.

## 3. 실패·지연·형식 이상 정책

| 상황 | 내부 응답 |
|---|---|
| 날짜 형식/실제 날짜/기간 유형 오류 | `400 VALIDATION_ERROR` |
| KOBIS HTTP 오류, 네트워크 오류 | `502 UPSTREAM_ERROR` |
| KOBIS 응답 JSON·목록·필수 필드·숫자 형식 이상 | `502 UPSTREAM_ERROR` (데이터 형식 오류) |
| `KOBIS_API_KEY` 미설정 등 서버 설정 오류 | `503 SERVICE_UNAVAILABLE` |
| KOBIS 요청이 5초 제한 초과 | `504 TIMEOUT` |

오류 본문은 `{ error: { code, message }, meta: { stale: false } }`다. 외부 오류에는 안전한 일반 문구만 반환하고 원본 URL·키·응답 본문을 노출하지 않는다.

## 4. 저장 전 검증

1. 요청의 `date`는 `YYYY-MM-DD` 정규식과 실제 날짜를 모두 확인한다.
2. `periodType`은 `daily`, `weekly`, `weekend`만 허용한다.
3. 목록과 `boxOfficeResult`가 존재하는지 확인한다. 빈 배열은 유효한 성공 응답이다.
4. 각 항목의 `movieCd`, `movieNm`, `rank`, `salesAmt`, `audiCnt`, `salesAcc`, `audiAcc`를 확인한다.
5. 숫자는 공백 제거 후 정수 문자열만 허용하고 `Number.isSafeInteger` 및 음수 여부를 확인한다. 잘못된 값을 0으로 대체하지 않는다.
6. `openDt`는 빈 값 또는 정확한 8자리 날짜만 허용한다.
7. 정규화 후 순위를 오름차순으로 정렬한다. 저장·캐시는 이 검증을 통과한 결과만 대상으로 한다(B단계).

KOBIS 응답의 한글이 전송 인코딩 문제로 mojibake(`ê...`)처럼 보이는 경우 서버에서만 Latin-1→UTF-8 복원을 시도한다. 복원에 실패하면 원문을 추측해 바꾸지 않고 형식 검증 실패로 처리한다.

## 5. DATA_MODE 확인

- `DATA_MODE=demo`: 기존 `BoxOfficeDemo`와 고정 fixture를 사용한다. KOBIS 호출이 발생하지 않는다.
- `DATA_MODE=live`: `BoxOfficeLive`가 `/api/box-office`를 호출하고 서버가 KOBIS 실제 데이터를 반환한다. 따라서 `2026-09-06`도 KOBIS가 반환하는 실제 목록이 있으면 빈 결과로 처리하지 않는다.

확인 명령:

```powershell
$env:DATA_MODE="demo"; npm run dev
# 브라우저: http://localhost:3000

# live는 .env.local의 KOBIS_API_KEY가 설정된 서버에서 실행
$env:DATA_MODE="live"; npm run dev
Invoke-WebRequest "http://localhost:3000/api/box-office?date=2026-09-06&periodType=daily"
```

이 단계에서는 DB·Supabase·캐시를 호출하지 않는다.
