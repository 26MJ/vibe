# Box Office Insight Dashboard

KOBIS 영화관입장권통합전산망의 박스오피스 데이터를 조회하고, 일별 Top 10 관측 데이터를 기준으로 매출·관객 인사이트를 보여주는 Next.js 프로젝트입니다.

## 필요한 환경

- Node.js `22.x` (`.node-version` 기준)
- npm
- 브라우저
- live 모드에서는 KOBIS API 키와 Supabase 프로젝트가 필요합니다.

## 설치

```bash
git clone https://github.com/26MJ/vibe.git
cd vibe
npm install
```

## 키 없이 demo 실행

`.env.local`을 만들고 다음처럼 설정합니다.

```env
DATA_MODE=demo
```

실행:

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다. demo에서는 외부 API와 DB를 호출하지 않고 고정 fixture를 사용합니다.

## 환경변수 이름

실제 값은 `.env.local` 또는 배포 서비스의 서버 환경변수 입력란에만 저장합니다.

```env
DATA_MODE=demo|live
KOBIS_API_KEY=
SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

실제 값이 들어간 `.env.local`은 Git에 커밋하지 않습니다. 화면·로그·문서에는 환경변수 이름만 남깁니다.

## live 실행

1. Supabase 프로젝트를 만들고 `supabase/migrations/001_box_office.sql`을 실행합니다.
2. `.env.local`에 `DATA_MODE`, `KOBIS_API_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 설정합니다.
3. 서버를 재시작합니다.

```bash
npm run dev
```

live 모드에서는 `/api/box-office`가 저장본을 먼저 확인하고, 저장본이 없거나 만료되면 KOBIS를 호출합니다.

## 검증 명령

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm run verify:data -- --date=YYYY-MM-DD --period=daily
```

`verify:data`는 DB 저장 데이터와 새 KOBIS 응답을 비교합니다. 종료 코드는 `0` 일치, `1` 불일치 또는 실패, `2` 저장 데이터 없음입니다.

## 주요 경로

- [배포 가이드](docs/DEPLOYMENT.md)
- [API 가이드](docs/API_GUIDE.md)
- [구현 계획서](docs/IMPLEMENTATION.md)
- [AC 점검 결과](docs/ACCEPTANCE.md)
- [Supabase migration](supabase/migrations/001_box_office.sql)

## 사용 가능한 npm scripts

| 명령 | 용도 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | Production 빌드 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript 검사 |
| `npm test` | Vitest 테스트 |
| `npm run test:e2e` | Playwright 브라우저 테스트 |
| `npm run verify:data -- --date=YYYY-MM-DD --period=daily` | DB·KOBIS 저장 데이터 검증 |
