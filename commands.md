# 프로젝트 실행 명령어

## 초기 설정

```bash
# 패키지 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일에 실제 값 입력
```

## 개발 서버

```bash
pnpm dev        # http://localhost:3000
pnpm build      # 프로덕션 빌드
pnpm start      # 프로덕션 서버 (build 후)
pnpm lint       # ESLint 검사
```

## Prisma

```bash
# 마이그레이션 생성 + 적용 (스키마 변경 시)
npx prisma migrate dev --name <이름>

# 마이그레이션만 적용 (프로덕션)
npx prisma migrate deploy

# Prisma Studio (DB GUI)
npx prisma studio

# 클라이언트 재생성 (schema.prisma 변경 후)
npx prisma generate
```

## shadcn/ui 컴포넌트 추가

```bash
pnpm dlx shadcn@latest add <컴포넌트명>
# 예: pnpm dlx shadcn@latest add button card input
```

## 환경 변수 목록

| 변수 | 설명 | 출처 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Supabase > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Supabase > Settings > API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Supabase > Settings > API |
| `STRAVA_CLIENT_ID` | Strava 앱 Client ID | strava.com/settings/api |
| `STRAVA_CLIENT_SECRET` | Strava 앱 Client Secret | strava.com/settings/api |
| `STRAVA_REDIRECT_URI` | OAuth 콜백 URL | `http://localhost:3000/api/auth/strava/callback` |
| `NEXT_PUBLIC_APP_URL` | 앱 베이스 URL | `http://localhost:3000` |
| `DATABASE_URL` | Supabase DB (pgbouncer, port 6543) | Supabase > Settings > Database |
| `DIRECT_URL` | Supabase DB 직접 연결 (port 5432) | Supabase > Settings > Database |
