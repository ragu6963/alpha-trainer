# 기술 스택: AI 러닝 코치

> 상위 문서: [prd.md](prd.md) | 기능 요구서: [requirements.md](requirements.md)
> 최종 업데이트: 2026-03-22

## 1. 런타임 및 언어

| 기술 | 버전 | 비고 |
|------|------|------|
| **Node.js** | 24.x LTS (Krypton) | Active LTS, 2028-04까지 지원 |
| **TypeScript** | 5.9 | 안정 릴리스 사용. TS 6.0 RC 출시되었으나 MVP에서는 5.9 유지 |
| **패키지 매니저** | pnpm | 디스크 효율, 빠른 설치, Vercel 네이티브 지원 |

---

## 2. 프레임워크

| 기술 | 버전 | 비고 |
|------|------|------|
| **Next.js** | 16.x (App Router) | Turbopack 기본, React 19.2, Server/Client Components |
| **React** | 19.2 (Next.js 16 내장) | Server Components, Suspense, use() hook |

### Next.js 활용 방식
- **App Router** 전용 (Pages Router 미사용)
- **Server Components** 기본, 클라이언트 인터랙션 필요 시에만 `'use client'`
- **Route Handlers** (`app/api/`)로 백엔드 API 구현
- **Middleware** (`middleware.ts`)로 인증 가드 처리
- **Server Actions** 는 사용하지 않음 — API Route로 통일하여 일관성 유지

---

## 3. 스타일링 및 UI

| 기술 | 버전 | 비고 |
|------|------|------|
| **Tailwind CSS** | 4.2 | CSS-first 설정 (`@theme`), JS config 불필요 |
| **shadcn/ui** | CLI v4 | Radix UI 통합 패키지(`radix-ui`) 사용, new-york 스타일 |
| **Lucide React** | latest | shadcn/ui 기본 아이콘 세트 |

### Tailwind CSS v4 참고사항
- `tailwind.config.js` 대신 CSS 파일 내 `@theme` 디렉티브로 테마 설정
- `@tailwindcss/postcss` 플러그인 사용

---

## 4. 데이터베이스 및 ORM

| 기술 | 버전 | 비고 |
|------|------|------|
| **Supabase** (PostgreSQL) | — | 인증/DB/Vault 통합, 무료 티어 |
| **Prisma ORM** | 7.x | 타입 안전 DB 접근, 마이그레이션 관리 |
| **@supabase/supabase-js** | 2.x | Supabase 클라이언트 SDK |
| **@supabase/ssr** | latest | Next.js App Router용 SSR 인증 헬퍼 (PKCE 기본) |

### Prisma 7 참고사항
- Rust 엔진 제거, 순수 JS/TS 기반으로 경량화
- `BigInt` JSON 직렬화 주의: Prisma 7.3+에서 `relationJoins`의 BigInt 정밀도 개선됨
- API 응답 시 `JSON.stringify` 대신 superjson 또는 수동 `String()` 변환 적용

### Supabase 활용 범위
| 기능 | 사용 여부 | 설명 |
|------|-----------|------|
| **Auth** | O | Strava OAuth 후 세션 관리 (JWT) |
| **Database** | O | PostgreSQL + Row Level Security |
| **Vault** | O | LLM API 키 암호화 저장 |
| **Storage** | X | 파일 업로드 없음 |
| **Edge Functions** | X | Next.js API Route 사용 |
| **Realtime** | X | 실시간 기능 불필요 |

---

## 5. AI / LLM

| 기술 | 버전 | 비고 |
|------|------|------|
| **Vercel AI SDK** | 6.x (`ai`) | `streamText`, `generateText` — 프로바이더 추상화 |
| **@ai-sdk/google** | 3.x | MVP: Gemini 프로바이더 어댑터 |
| **@ai-sdk/openai** | — (P1) | GPT 프로바이더 어댑터 |
| **@ai-sdk/anthropic** | — (P1) | Claude 프로바이더 어댑터 |

### 지원 모델 (2026-03 기준)

| 프로바이더 | 모델 | 우선순위 |
|-----------|------|----------|
| **Google Gemini** | `gemini-3.1-flash`, `gemini-3.1-flash-lite`, `gemini-3.1-pro` | P0 (MVP) |
| **OpenAI** | `gpt-5.4-mini`, `gpt-5.4-nano`, `gpt-5.4-pro` | P1 |
| **Anthropic Claude** | `claude-sonnet-4-6`, `claude-haiku-4-5`, `claude-opus-4-6` | P1 |

### AI SDK 활용 방식
```typescript
// Route Handler에서 ReadableStream 반환
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

export async function POST(req: Request) {
  const result = streamText({
    model: google('gemini-3.1-flash', { apiKey: userApiKey }),
    system: systemPrompt,
    messages,
  });
  return result.toDataStreamResponse();
}
```

---

## 6. 차트

| 기술 | 버전 | 비고 |
|------|------|------|
| **Recharts** | 3.x | React 네이티브 차트, P1 데이터 시각화에서 사용 |

---

## 7. 외부 API

| API | 용도 | 인증 방식 |
|-----|------|-----------|
| **Strava API v3** | 러닝 활동 데이터 수집 | OAuth 2.0 (access_token) |

### Strava API 제한
- 15분당 100회, 일 1,000회
- Rate limit 초과 시 `429` 응답 → 재시도 큐 처리

---

## 8. 배포 및 인프라

| 기술 | 비고 |
|------|------|
| **Vercel** | Next.js 최적 배포, 무료 티어 (Hobby) |
| **GitHub** | 소스 코드 관리, Vercel과 자동 배포 연동 |

### Vercel 설정
- **Framework Preset**: Next.js
- **Build Command**: `pnpm build`
- **Node.js Version**: 24.x
- **환경 변수**: Strava OAuth 키, Supabase URL/Key, 암호화 시크릿

---

## 9. 개발 도구

| 도구 | 용도 |
|------|------|
| **Claude Code** | AI 바이브 코딩 |
| **ESLint** | Next.js 기본 린트 룰 (`next/core-web-vitals`) |
| **Prettier** | 코드 포매팅 |
| **Turbopack** | Next.js 16 기본 번들러 (dev/build) |

---

## 10. 주요 npm 패키지 요약

### 프로덕션 의존성
```
next@16
react@19
typescript@5.9
tailwindcss@4
@supabase/supabase-js@2
@supabase/ssr
prisma@7 (devDependency)
@prisma/client@7
ai@6
@ai-sdk/google@3
recharts@3
lucide-react
```

### MVP에서 제외 (P1에서 추가)
```
@ai-sdk/openai
@ai-sdk/anthropic
```
