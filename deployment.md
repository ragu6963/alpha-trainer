# Vercel 배포 가이드

> 최종 업데이트: 2026-03-22

## 목차

1. [사전 준비](#1-사전-준비)
2. [Supabase 설정](#2-supabase-설정)
3. [Strava OAuth 앱 설정](#3-strava-oauth-앱-설정)
4. [Vercel 프로젝트 생성](#4-vercel-프로젝트-생성)
5. [환경 변수 설정](#5-환경-변수-설정)
6. [DB 마이그레이션 실행](#6-db-마이그레이션-실행)
7. [배포 확인](#7-배포-확인)
8. [트러블슈팅](#8-트러블슈팅)

---

## 1. 사전 준비

다음 계정이 필요합니다.

- [Vercel](https://vercel.com) 계정 (Hobby 플랜 무료)
- [Supabase](https://supabase.com) 계정 (무료 티어)
- [Strava](https://www.strava.com/settings/api) 개발자 계정
- GitHub 저장소 (Vercel과 연동)

---

## 2. Supabase 설정

### 2-1. 프로젝트 생성

1. Supabase 대시보드 → **New project** 클릭
2. 프로젝트 이름, DB 비밀번호, 리전(Northeast Asia - Tokyo 권장) 입력
3. 프로젝트 생성 완료까지 대기 (~1분)

### 2-2. 연결 문자열 복사

**Settings → Database → Connection string**에서 두 가지 URL을 복사합니다.

| 항목 | 용도 | 경로 |
|------|------|------|
| **Transaction pooler URL** | 앱 런타임 (`DATABASE_URL`) | Connection pooling → Transaction mode |
| **Direct connection URL** | Prisma ORM (`DIRECT_URL`) | Direct connection |

> **주의:** Transaction pooler URL은 포트 `6543`, Direct URL은 포트 `5432`입니다.
> 두 URL 모두 비밀번호 자리에 실제 DB 비밀번호를 입력해야 합니다.

### 2-3. API 키 복사

**Settings → API**에서 복사합니다.

| 항목 | 환경 변수명 |
|------|------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| anon / public key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role key | `SUPABASE_SERVICE_ROLE_KEY` |

### 2-4. Supabase Auth 설정

**Authentication → URL Configuration**에서:

- **Site URL**: `https://<your-domain>.vercel.app`
- **Redirect URLs**: 다음 두 URL을 추가
  ```
  https://<your-domain>.vercel.app/auth/callback
  https://<your-domain>.vercel.app/api/auth/strava/callback
  ```

### 2-5. Vault 활성화

**Settings → Vault** 메뉴에서 Vault를 활성화합니다.
(사용자 LLM API 키 암호화 저장에 사용됩니다.)

---

## 3. Strava OAuth 앱 설정

1. [Strava API 설정 페이지](https://www.strava.com/settings/api) 접속
2. **My API Application** 생성 또는 수정
3. 다음 값을 입력합니다.

| 항목 | 값 |
|------|----|
| Application Name | Alpha Trainer (원하는 이름) |
| Category | Training |
| Club | (비워도 됨) |
| Website | `https://<your-domain>.vercel.app` |
| Authorization Callback Domain | `<your-domain>.vercel.app` |

4. **Client ID**와 **Client Secret** 복사

> **로컬 개발 시:** Authorization Callback Domain에 `localhost`도 추가하거나, 별도 개발용 앱을 만드세요.

---

## 4. Vercel 프로젝트 생성

1. [Vercel 대시보드](https://vercel.com/dashboard) → **Add New → Project**
2. GitHub 저장소 연결 → `alpha-trainer` 선택
3. **Configure Project** 화면에서 다음 확인:
   - **Framework Preset**: Next.js (자동 감지됨)
   - **Build Command**: `pnpm build`
   - **Install Command**: `pnpm install`
   - **Node.js Version**: 22.x 이상 선택 (24.x 권장)
4. 아직 **Deploy** 하지 말고 환경 변수를 먼저 설정합니다.

---

## 5. 환경 변수 설정

Vercel 프로젝트 → **Settings → Environment Variables**에서 아래 변수를 모두 추가합니다.

### 필수 환경 변수

| 변수명 | 값 | 환경 |
|--------|-----|------|
| `NEXT_PUBLIC_APP_URL` | `https://<your-domain>.vercel.app` | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key | All |
| `DATABASE_URL` | Supabase Transaction pooler URL | All |
| `DIRECT_URL` | Supabase Direct connection URL | All |
| `STRAVA_CLIENT_ID` | Strava Client ID | All |
| `STRAVA_CLIENT_SECRET` | Strava Client Secret | All |
| `STRAVA_REDIRECT_URI` | `https://<your-domain>.vercel.app/api/auth/strava/callback` | Production |

> **`NEXT_PUBLIC_` 접두사가 붙은 변수**는 브라우저에 노출됩니다. 민감 정보를 넣지 마세요.

### 로컬 개발용 `.env.local` 예시

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

DATABASE_URL=postgresql://postgres.xxxx:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres

STRAVA_CLIENT_ID=12345
STRAVA_CLIENT_SECRET=abc123...
STRAVA_REDIRECT_URI=http://localhost:3000/api/auth/strava/callback
```

---

## 6. DB 마이그레이션 실행

Vercel은 자동으로 Prisma 마이그레이션을 실행하지 않습니다. **로컬에서** 직접 실행해야 합니다.

```bash
# .env.local에 DIRECT_URL이 설정된 상태에서 실행
pnpm prisma migrate deploy
```

> `migrate deploy`는 `DIRECT_URL`로 연결합니다. `DATABASE_URL`(Transaction pooler)로는 DDL 쿼리가 실패할 수 있으니 `DIRECT_URL`이 올바른지 확인하세요.

### Prisma Client 재생성 (필요 시)

```bash
pnpm prisma generate
```

---

## 7. 배포 확인

1. Vercel 프로젝트 → **Deployments** 탭에서 빌드 로그 확인
2. 배포 완료 후 다음 항목을 순서대로 테스트합니다.

| 테스트 항목 | URL |
|------------|-----|
| 홈 페이지 로딩 | `https://<domain>.vercel.app/` |
| Strava 로그인 | `https://<domain>.vercel.app/api/auth/strava` |
| Strava 콜백 | 로그인 후 자동 처리 |
| 대시보드 진입 | 로그인 성공 후 리다이렉트 |

---

## 8. 트러블슈팅

### 빌드 실패: `Cannot find module '@/generated/prisma/client'`

Prisma Client가 생성되지 않은 경우입니다. `package.json`의 `build` 스크립트를 수정합니다.

```json
"scripts": {
  "build": "prisma generate && next build"
}
```

### DB 연결 오류: `Can't reach database server`

- `DIRECT_URL` 환경 변수가 올바른지 확인
- Supabase 프로젝트가 일시 중지(paused) 상태인지 확인 (무료 티어는 7일 미사용 시 일시 중지)
- Supabase **Settings → Database → Connection pooling** 활성화 여부 확인

### Strava 콜백 오류: `redirect_uri mismatch`

- Strava API 앱의 **Authorization Callback Domain**이 실제 배포 도메인과 일치하는지 확인
- `STRAVA_REDIRECT_URI` 환경 변수가 Vercel 도메인과 일치하는지 확인

### Preview 배포에서 Strava 콜백 오류

Preview 배포는 매번 URL이 달라집니다. `STRAVA_REDIRECT_URI`를 Preview 환경에서 별도로 관리하거나, Strava 개발용 앱을 따로 만들어 사용하세요.

### `NEXT_PUBLIC_APP_URL` 관련 오류

Preview 배포에서도 올바른 도메인이 필요하면 Vercel의 [System Environment Variables](https://vercel.com/docs/projects/environment-variables/system-environment-variables) 중 `VERCEL_URL`을 활용할 수 있습니다.

```ts
const appUrl = process.env.NEXT_PUBLIC_APP_URL
  ?? `https://${process.env.VERCEL_URL}`
```
