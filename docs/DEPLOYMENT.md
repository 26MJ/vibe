# 배포 가이드

확인 날짜: 2026-10-25 (Asia/Seoul)

## 1. 사용할 서비스와 무료 제한

### Vercel Hobby

이 프로젝트는 Next.js App Router와 Route Handler를 사용하므로 Vercel Hobby를 배포 대상으로 사용한다. Hobby는 개인·비상업 용도에 한정된다. 공식 문서 기준으로 주요 제한은 다음과 같다.

| 항목 | Hobby 무료 범위/제한 |
|---|---:|
| 가격 | $0/월 |
| Function invocations | 월 1,000,000회 |
| Fast data transfer | 월 100GB |
| Build execution | 월 6,000분 |
| Active CPU | 월 4 CPU-hours |
| 프로젝트 | 200개 |
| 배포 | 하루 100회, 시간당 32회 빌드 제한 |
| 빌드 | 배포당 최대 45분, 동시 빌드 1개 |
| 런타임 로그 | 1시간 보관 |
| 환경변수 | 프로젝트 환경별 최대 1,000개, Node 프로젝트 총 64KB |

사용량을 초과하면 Hobby 프로젝트가 일시 중지될 수 있다. 상업 서비스나 팀 협업이 필요하면 Pro 이상을 검토한다.

- [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby)
- [Vercel Limits](https://vercel.com/docs/limits)
- [Vercel Plans](https://vercel.com/docs/plans)

### Supabase Free

KOBIS 데이터를 저장하고 기간별 캐시를 제공하는 Postgres로 Supabase Free를 사용한다.

| 항목 | Free 무료 범위/제한 |
|---|---:|
| 무료 프로젝트 | 활성 프로젝트 2개 |
| DB 용량 | 프로젝트당 500MB |
| 파일 스토리지 | 1GB |
| Egress | 5GB |
| Monthly active users | 50,000 MAU |
| Edge Function invocations | 500,000회 |
| Realtime messages | 2,000,000회 |
| Realtime peak connections | 200 |
| 비활성 프로젝트 | 1주 비활성 후 일시 중지될 수 있음 |

이번 프로젝트는 일반 Postgres와 RPC만 사용하므로 Free 범위에서 시작할 수 있지만, KOBIS 호출량·DB 증가량·비활성 일시 중지 여부를 대시보드에서 확인한다.

- [Supabase Billing](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Bandwidth](https://supabase.com/docs/guides/storage/serving/bandwidth)

## 2. 실제 배포 절차

### 사용자가 직접 해야 하는 단계

1. GitHub 계정으로 Vercel에 로그인한다.
2. `26MJ/vibe` 저장소에 접근할 수 있도록 GitHub 권한을 승인한다.
3. Supabase에서 프로젝트를 만들고 SQL Editor에서 `supabase/migrations/001_box_office.sql` 전체를 실행한다.
4. Supabase Project URL과 서버 전용 secret을 확인한다.
5. Vercel Project Settings → Environment Variables에 아래 변수 이름을 Production과 Preview에 등록한다. 값은 Vercel 입력란에만 넣는다.

```text
DATA_MODE
KOBIS_API_KEY
SUPABASE_URL
SUPABASE_SECRET_KEY
```

### 배포 순서

1. Vercel Dashboard에서 `Add New Project`를 선택한다.
2. GitHub 저장소 `26MJ/vibe`를 import한다.
3. Root Directory는 저장소 루트로 둔다.
4. Framework Preset은 Next.js로 둔다.
5. Install Command는 `npm install`, Build Command는 `npm run build`로 둔다.
6. Output Directory는 Next.js 기본값을 사용한다.
7. 환경변수를 설정한다. 실제 키 값은 이 문서나 Git에 기록하지 않는다.
8. Deploy를 실행한다.
9. 배포 완료 후 Vercel이 제공한 Production URL을 연다.
10. 아래 확인표를 실행하고 결과를 기록한다.

## 3. 민감한 값 보관 규칙

| 위치 | 허용 내용 |
|---|---|
| 로컬 개발 | `C:\vive24\.env.local`에 환경변수 이름과 실제 값 저장 |
| Vercel | Project Settings → Environment Variables에 실제 값 저장 |
| Supabase | Dashboard의 프로젝트 설정과 secret 관리 영역에 저장 |
| GitHub 저장소 | `.env.example`에는 이름만, 실제 값은 절대 저장하지 않음 |
| 화면·로그·문서 | 환경변수 이름만 기록하고 값은 기록하지 않음 |

브라우저에서 읽어야 하는 `NEXT_PUBLIC_` 변수로 비밀값을 만들지 않는다. KOBIS와 Supabase 호출은 서버 Route Handler에서만 수행한다. 키가 출력된 로그·스크린샷·문서·커밋은 즉시 폐기하고 키를 폐기·재발급한다.

## 4. 배포 후 확인표

현재 배포 URL이 제공되지 않아 다음 항목은 아직 실행하지 않았다.

| 확인 항목 | 환경 | 결과 | 이유/확인 방법 |
|---|---|---|---|
| Production URL 접속 | 실제 배포 | 미실행 | Vercel 배포 URL이 아직 없음 |
| `DATA_MODE=demo` F1 목록 | 실제 배포 | 미실행 | 배포 URL 필요; 로컬 demo E2E는 통과 |
| F1 빈 결과·검색 없음·오류 상태 | 실제 배포 | 미실행 | 배포 URL 필요 |
| `DATA_MODE=live` KOBIS 조회 | 실제 배포 + 실제 API | 미실행 | 배포 URL과 운영 환경변수 필요 |
| Supabase 저장·캐시 hit | 실제 배포 + 실제 DB | 미실행 | Supabase RPC가 준비된 운영 프로젝트 필요 |
| 첫 요청 `source=kobis`, 두 번째 `source=database` | 실제 배포 + 실제 DB | 미실행 | 배포 후 동일 요청 2회 실행 |
| `verify:data` 종료 코드 0 | 실제 DB | 미실행 | 저장 기간이 먼저 존재해야 함 |
| 운영 키가 HTML·응답·로그에 없는지 | 실제 배포 | 미실행 | 배포 후 브라우저 네트워크·Vercel 로그 점검 |

배포 전에 로컬에서 확인한 범위는 `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `DATA_MODE=demo` E2E다. 이는 Production과 실제 Supabase 통과를 의미하지 않는다.

## 5. 변경·롤백·키 노출 대응

### 환경변수 변경

1. Vercel Project Settings에서 해당 환경의 변수만 수정한다.
2. 저장 후 새 배포를 실행한다. 기존 배포에는 자동으로 적용되지 않는다.
3. 새 배포의 Production URL에서 demo/live와 API 상태를 재확인한다.

### 배포 롤백

1. Vercel Deployments에서 마지막 정상 배포를 선택한다.
2. 해당 배포의 `Promote to Production`을 실행한다.
3. 환경변수와 Supabase 스키마가 현재 코드와 호환되는지 확인한다.
4. 롤백 결과를 배포 기록에 남긴다.

### 키 노출

1. 노출된 KOBIS 키와 Supabase secret을 즉시 폐기한다.
2. 새 키를 발급하고 로컬 `.env.local`과 Vercel 환경변수를 교체한다.
3. 노출된 커밋·로그·스크린샷은 삭제 또는 비공개 처리한다.
4. 새 배포를 실행하고 API 응답·로그·번들에 키가 없는지 확인한다.

## 6. 다른 컴퓨터에서 처음부터 확인하는 절차

1. Git과 Node.js `22.x`를 설치한다. 프로젝트의 `.node-version`을 기준으로 Node 버전을 맞춘다.
2. 저장소를 clone한다.
3. 프로젝트 루트에서 `npm install`을 실행한다.
4. 키 없이 먼저 확인하려면 `.env.local`에 `DATA_MODE=demo`만 설정한다.
5. `npm run dev`를 실행하고 `http://localhost:3000`을 연다.
6. 아래 명령을 실행한다.

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

7. live를 확인하려면 사용자가 직접 KOBIS·Supabase 환경변수를 `.env.local`에 넣고 migration을 실행한다.
8. `npm run dev`를 다시 실행한 뒤 `/api/box-office`와 `npm run verify:data -- --date=YYYY-MM-DD --period=daily`를 확인한다.

현재 확인 범위는 같은 PC의 `C:\vive24` 작업 폴더와 별도 demo E2E 실행이다. 실제로 다른 컴퓨터에서 clone부터 설치까지 수행한 검증, 실제 Vercel 배포, 실제 Supabase Free 프로젝트 검증은 아직 미실행이다.
