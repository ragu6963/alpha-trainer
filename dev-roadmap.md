# 개발 로드맵: AI 러닝 코치

> 상위 문서: [prd.md](prd.md) | 기능 요구서: [requirements.md](requirements.md) | 기술 스택: [tech-stack.md](tech-stack.md)
> 최종 업데이트: 2026-03-22

---

## Step 1: 프로젝트 기반 구축

### 1-1. Next.js 프로젝트 초기화
- [x] `pnpm create next-app@16` 으로 프로젝트 생성
  - App Router, TypeScript 5.9, Turbopack, ESLint 선택
  - `src/` 디렉토리 구조 사용
- [x] `.env`, `.env.example` 정리 (Supabase, Strava, App URL)
- [x] `pnpm add -D prettier` 및 Prettier 설정 파일 생성

### 1-2. Tailwind CSS + shadcn/ui 설정
- [x] Tailwind CSS v4 확인 (Next.js 16 기본 포함)
- [x] `@tailwindcss/postcss` 설정 확인
- [x] CSS 파일 내 `@theme` 디렉티브로 커스텀 테마 토큰 정의 (컬러, 폰트 등)
- [x] `pnpm dlx shadcn@latest init` (new-york 스타일)
- [x] 공통 UI 컴포넌트 추가: `button`, `card`, `input`, `dialog`, `toast`, `tabs`, `dropdown-menu`

### 1-3. 기본 레이아웃 구축
- [x] `app/layout.tsx`: 루트 레이아웃 (HTML lang="ko", 폰트, 메타데이터)
- [x] 반응형 네비게이션 셸 구현
  - 데스크톱: 상단 네비게이션 바 (로고, 대시보드, AI 코치, 설정)
  - 모바일: 하단 탭 바 (대시보드, AI 코치, 설정)
- [x] viewport meta 태그 설정
- [x] 인증 필요 영역 레이아웃 (`app/(authenticated)/layout.tsx`)

### 1-4. Supabase + Prisma 설정
- [x] `pnpm add @supabase/supabase-js @supabase/ssr`
- [x] `pnpm add -D prisma` + `pnpm add @prisma/client`
- [x] Supabase 클라이언트 유틸리티 생성
  - `lib/supabase/client.ts` — 브라우저용 (anon key)
  - `lib/supabase/server.ts` — 서버용 (service role key)
- [x] Prisma 초기화 (`npx prisma init --datasource-provider postgresql`)
- [x] `prisma/schema.prisma`에 전체 모델 정의 (User, Activity, Conversation, Message, UserLLMKey)
- [x] Supabase DB 연결 문자열 설정 (`DATABASE_URL`)
- [x] `npx prisma migrate dev --name init` 으로 초기 마이그레이션 실행
- [x] Prisma Client 싱글톤 유틸리티 생성 (`lib/prisma.ts`)

### 1-5. 페이지 스캐폴딩
- [x] 각 라우트별 빈 페이지 파일 생성 (구조만 잡기)
  - `app/page.tsx` — 랜딩
  - `app/(authenticated)/dashboard/page.tsx`
  - `app/(authenticated)/coach/page.tsx`
  - `app/(authenticated)/activities/[id]/page.tsx`
  - `app/(authenticated)/settings/page.tsx`

### 완료 기준
- [x] `pnpm dev`로 로컬 서버 정상 기동
- [x] shadcn/ui 컴포넌트 렌더링 확인
- [x] Prisma migrate 성공, Supabase DB에 테이블 생성 확인
- [x] 각 경로 접속 시 빈 페이지 렌더링 확인

---

## Step 2: 인증

### 2-1. Strava OAuth 시작 엔드포인트
- [x] `app/api/auth/strava/route.ts` (GET)
- [x] Strava OAuth URL 생성 (`https://www.strava.com/oauth/authorize`)
  - `client_id`, `redirect_uri`, `response_type=code`, `scope=read,activity:read_all`
  - CSRF 방지용 `state` 파라미터 생성 및 쿠키 저장
- [x] 사용자를 Strava 인증 페이지로 리다이렉트

### 2-2. Strava OAuth 콜백 처리
- [x] `app/api/auth/strava/callback/route.ts` (GET)
- [x] Strava로부터 `code` 수신 → `POST https://www.strava.com/oauth/token`으로 토큰 교환
- [x] 수신 데이터: `access_token`, `refresh_token`, `expires_at`, `athlete` (프로필)
- [x] `state` 파라미터 검증 (CSRF 방지)

### 2-3. Supabase Auth 연동
- [x] Strava `athlete_id` 기반으로 Supabase Auth 사용자 처리:
  - 기존 사용자 → `signInWithPassword` (athlete_id 기반 이메일+비밀번호)
  - 신규 사용자 → `signUp` + User 테이블에 레코드 생성
- [x] Supabase 세션 (JWT) 발급 → 응답 쿠키에 설정
- [x] Strava 토큰은 User 테이블에 별도 저장 (암호화)

### 2-4. 미들웨어 인증 가드
- [x] `proxy.ts` 로 대체 `@supabase/ssr`로 세션 검증
- [x] 인증 필요 경로 (`/dashboard`, `/coach`, `/activities/*`, `/settings`) 보호
- [x] 미인증 시 랜딩 페이지(`/`)로 리다이렉트
- [x] 인증 완료 상태에서 `/` 접근 시 `/dashboard`로 리다이렉트

### 2-5. Strava 토큰 자동 리프레시
- [x] Strava API 호출 전 `tokenExpiresAt` 확인
- [x] 만료되었거나 임박한 경우 `POST https://www.strava.com/oauth/token` (grant_type=refresh_token)
- [x] 새 토큰으로 DB 업데이트
- [x] 리프레시 실패 시 사용자에게 재인증 안내 (세션 무효화 + 리다이렉트)

### 2-6. 랜딩 페이지 UI
- [x] `app/page.tsx`: 서비스 소개 + "Strava로 시작하기" CTA 버튼
- [x] 버튼 클릭 → `/api/auth/strava`로 이동

### 완료 기준
- [x] "Strava로 시작하기" → Strava 인증 → 콜백 → 대시보드 리다이렉트 전체 플로우 동작
- [x] Supabase Auth에 사용자 생성 확인
- [x] User 테이블에 Strava 토큰 저장 확인
- [x] 미인증 상태에서 보호 경로 접근 시 랜딩 페이지로 리다이렉트 확인
- [x] 토큰 만료 시 자동 리프레시 동작 확인

---

## Step 3: 러닝 데이터 수집

### 3-1. Strava API 클라이언트
- [x] `lib/strava.ts`: Strava API 래퍼 유틸리티
  - 토큰 자동 리프레시 로직 통합 (Step 2-5 활용)
  - Rate limit 헤더 파싱 (`X-RateLimit-Limit`, `X-RateLimit-Usage`)
  - Rate limit 초과 시 대기 시간 계산 + 자동 재시도 큐 (15분당 100회, 일 1,000회)

### 3-2. 활동 데이터 수집 API
- [x] `app/api/strava/sync/route.ts` (POST)
- [x] 최초 동기화: 전체 활동 수집 (페이지네이션, `per_page=200`)
- [x] 이후 동기화: `lastSyncedAt` 이후 새 활동만 수집 (`after` 파라미터)
- [x] `Run` 타입 활동만 필터링 (`type === 'Run'`)
- [x] 수집 필드: id, name, distance, moving_time, elapsed_time, start_date, average_speed, max_speed, average_heartrate, max_heartrate, total_elevation_gain, elev_high, elev_low, start_latlng, end_latlng
- [x] DB 저장: Prisma `upsert`로 중복 방지 (stravaActivityId 기준)
- [x] `lastSyncedAt` 갱신
- [x] BigInt 직렬화 처리 (Strava activity ID → BigInt)

### 3-3. 동기화 진행률 UI
- [x] 대시보드 또는 온보딩 화면에 동기화 상태 표시
  - "동기화 중..." + 프로그레스 바 (수집된 활동 수 / 예상 전체)
  - 완료 시 "N개의 활동이 동기화되었습니다" 토스트 알림
- [x] "동기화" 버튼 (수동 트리거)
- [x] 마지막 동기화 시각 표시

### 3-4. 에러 핸들링
- [x] Strava API 401: 토큰 리프레시 시도 → 실패 시 재인증 안내
- [x] Strava API 429: Rate limit 초과 → 남은 대기 시간 안내, 자동 재시도
- [x] 네트워크 에러: 재시도 버튼 + 토스트 알림
- [x] 데이터 없음: "아직 Strava에 러닝 기록이 없습니다" 안내 메시지

### 완료 기준
- [x] 동기화 버튼 클릭 → Strava에서 러닝 활동 수집 → DB 저장 확인
- [x] Run 타입만 필터링되는지 확인
- [x] 중복 동기화 시 데이터 중복 없음 확인
- [x] 진행률 UI 동작 확인
- [x] Rate limit 시나리오 대응 확인

---

## Step 4: 대시보드

### 4-1. 대시보드 메인 페이지
- [x] `app/(authenticated)/dashboard/page.tsx`
- [x] Server Component로 초기 데이터 로드

### 4-2. 이번 주 요약 통계 카드
- [x] 이번 주 (월~일) 기준 집계:
  - 총 러닝 횟수
  - 총 거리 (km, 소수점 1자리)
  - 총 시간 (시:분 형식)
- [x] 반응형: 모바일 세로 스택 → 데스크톱 3열 그리드

### 4-3. 최근 활동 목록
- [x] 최신순 정렬, 10개씩 페이지네이션
- [x] 각 활동 항목 표시: 날짜, 활동명, 거리(km), 시간, 평균 페이스(분'초"/km)
- [x] 클릭 시 `/activities/[id]`로 이동
- [x] 반응형: 모바일 카드형 → 데스크톱 테이블형

### 4-4. 마지막 동기화 정보
- [x] "마지막 동기화: N분 전" 표시
- [x] "동기화" 버튼 (Step 3-3 연동)

### 4-5. 활동 상세 페이지
- [x] `app/(authenticated)/activities/[id]/page.tsx`
- [x] 표시 항목:
  - 활동명, 날짜/시간
  - 거리 (km), 이동 시간, 경과 시간
  - 평균 페이스, 최고 페이스
  - 평균 심박수, 최고 심박수 (데이터 있는 경우)
  - 총 고도 상승, 최고/최저 고도
- [x] 반응형: 모바일 세로 나열 → 데스크톱 데이터 카드 그리드

### 4-6. API Routes
- [x] `app/api/activities/route.ts` (GET) — 활동 목록 조회 (페이지네이션, 인증 사용자 필터)
- [x] `app/api/activities/[id]/route.ts` (GET) — 활동 상세 조회
- [x] `app/api/stats/route.ts` (GET) — 이번 주 통계 데이터

### 4-7. 빈 상태 처리
- [x] 활동이 없는 경우: "아직 러닝 기록이 없습니다" + 동기화 안내 CTA
- [x] 이번 주 활동이 없는 경우: 통계 카드에 0 표시 + 격려 메시지

### 완료 기준
- [x] 대시보드에서 이번 주 통계 정상 표시
- [x] 최근 활동 목록 페이지네이션 동작
- [x] 활동 클릭 → 상세 페이지 전환 및 모든 필드 표시
- [x] 데이터 없는 경우 빈 상태 UI 표시
- [x] 모바일/데스크톱 반응형 동작 확인

---

## Step 5: AI 코치 (Gemini 우선)

### 5-1. LLM API 키 등록 UI
- [x] `/settings` 페이지 내 "AI 설정" 섹션
- [x] MVP: Google Gemini 키 입력 폼
  - API 키 입력 필드 (password 타입)
  - "키 검증" 버튼 — 테스트 API 호출로 유효성 확인
  - 등록된 키 마스킹 표시 (예: `AIza...xyz1`)
  - 키 삭제/교체 기능
- [x] 모델 선택 드롭다운: `gemini-3-flash-preview` (기본), `gemini-3.1-flash-lite-preview`, `gemini-3.1-pro-preview`

### 5-2. API 키 암호화 저장
- [x] `app/api/settings/llm-key/route.ts` (POST / DELETE)
- [x] Supabase Vault를 사용한 API 키 암호화 저장
  - `vault.create_secret()` / `vault.update_secret()` — Vault에 키 저장
  - UserLLMKey 테이블에는 Vault secret_id 참조 저장
- [x] 키 조회 시 Vault에서 복호화하여 사용
- [x] 키 삭제 시 Vault secret + DB 레코드 동시 삭제

### 5-3. 코칭 데이터 조회 유틸리티
- [x] `lib/coaching-data.ts`: AI 코치에 제공할 러닝 데이터 조회/포맷
- [x] 데이터 범위 정책 (requirements.md 5.3):
  - 최근 활동 상세: 최근 4주 또는 최근 20회 (먼저 도달하는 기준)
  - 주간 집계 통계: 최근 4주, 주별 총 거리/횟수/평균 페이스
  - 전체 요약: 총 활동 수, 첫 활동일, 누적 거리
- [x] 텍스트 포맷으로 변환 (시스템 프롬프트에 삽입할 형태)

### 5-4. 시스템 프롬프트 설계
- [x] `lib/system-prompt.ts`: 시스템 프롬프트 생성 함수
- [x] 프롬프트 구성 요소:
  - 역할 정의: 초보 러너를 위한 친근한 AI 러닝 코치
  - 코칭 원칙: 안전 우선, 점진적 발전, 10% 규칙
  - 응답 스타일: 한국어, 격려적 톤, 구체적 수치 기반
  - 범위 제한: 러닝 관련 질문에만 응답
  - 러닝 데이터 컨텍스트 (Step 5-3에서 생성한 텍스트)

### 5-5. 채팅 API 엔드포인트
- [x] `app/api/coach/chat/route.ts` (POST)
- [x] Vercel AI SDK 기반 스트리밍 응답:
  ```
  streamText → google(model, { apiKey }) → createUIMessageStreamResponse
  ```
- [x] 요청 처리 흐름:
  1. 인증 확인 (세션에서 userId 추출)
  2. UserLLMKey에서 활성 키 조회 → Vault에서 복호화
  3. 코칭 데이터 조회 (Step 5-3)
  4. 시스템 프롬프트 생성 (Step 5-4)
  5. `streamText` 호출 → ReadableStream 반환
- [x] 에러 처리: API 키 미등록, 키 무효, 잔액 부족, rate limit

### 5-6. 채팅 UI
- [x] `app/(authenticated)/coach/page.tsx`
- [x] 채팅 인터페이스 구현:
  - Vercel AI SDK `useChat` 훅 사용
  - 메시지 버블 (사용자: 우측, AI: 좌측)
  - 마크다운 렌더링 지원
  - 스트리밍 중 타이핑 인디케이터
  - 메시지 입력창 + 전송 버튼
  - 모바일: 키보드 올라올 때 입력창 sticky bottom
- [x] API 키 미등록 시 → 설정 페이지 안내 배너
- [x] 현재 사용 중인 프로바이더/모델 표시 (채팅 상단)

### 완료 기준
- [x] 설정에서 Gemini API 키 등록 → 검증 → 암호화 저장 확인
- [x] AI 코치 채팅에서 메시지 전송 → 스트리밍 응답 수신 확인
- [x] 시스템 프롬프트에 러닝 데이터가 포함되어 맥락 있는 답변 확인
- [x] API 키 미등록 상태에서 적절한 안내 표시
- [x] 마크다운 렌더링, 타이핑 인디케이터 동작 확인

---

## Step 6: 설정 페이지 + 마무리 및 배포

### 6-1. 설정 페이지 통합
- [x] `app/(authenticated)/settings/page.tsx`
- [x] 섹션 구성:
  - **Strava 연동**: 연결된 계정 정보, 토큰 상태 (유효/만료), 연결 해제 버튼
  - **AI 설정**: LLM API 키 관리 (Step 5-1 UI 통합)
  - **위험 영역**: 계정 삭제 버튼 (빨간색 경고 스타일)

### 6-2. 계정 삭제 기능
- [x] `app/api/auth/delete-account/route.ts` (DELETE)
- [x] 삭제 흐름:
  1. 확인 다이얼로그 (되돌릴 수 없음 안내, 텍스트 입력 확인)
  2. 관련 데이터 전체 삭제: Activity, Conversation, Message, UserLLMKey, User (Cascade)
  3. Supabase Vault에서 저장된 시크릿 삭제
  4. Supabase Auth 사용자 삭제
  5. Strava OAuth 연동 해제 (`POST https://www.strava.com/oauth/deauthorize`)
  6. 세션 무효화 → 랜딩 페이지로 리다이렉트

### 6-3. 에러 핸들링 강화
- [x] 전역 에러 바운더리 (`app/error.tsx`, `app/global-error.tsx`)
- [x] API Route 공통 에러 응답 포맷 통일 (`lib/api-error.ts`)
- [x] 토스트 알림 시스템 (성공/실패/경고)
- [x] 네트워크 오류 시 재시도 안내

### 6-4. Vercel 배포
- [x] GitHub 리포지토리 연동
- [x] Vercel 프로젝트 설정:
  - Framework: Next.js
  - Build Command: `pnpm build`
  - Node.js: 24.x
- [x] 환경 변수 등록 (Supabase URL/Key, Strava OAuth, App URL)
- [x] Strava OAuth `redirect_uri`를 프로덕션 도메인으로 변경
- [x] 프로덕션 빌드 + 배포 확인

### 완료 기준 (마일스톤)
- [x] 본인 Strava 계정으로 AI 코칭 받기 가능
- [x] Vercel에 배포 완료, 프로덕션 URL 접속 가능
- [x] 전체 사용자 여정 정상 동작

---

## Step 7: 사용성 개선 [P1]

### 7-1. 데이터 시각화
- [x] `pnpm add recharts`
- [x] 대시보드에 차트 섹션 추가:
  - 주간 거리 추이 (막대 차트)
  - 월간 페이스 변화 (라인 차트)
  - 주간 러닝 빈도 (막대 차트)
- [x] 기간 선택: 최근 4주 / 3개월 / 6개월
- [x] 반응형: 모바일에서 간소화된 뷰 또는 가로 스크롤

### 7-2. 대화 히스토리
- [ ] Conversation, Message 테이블 활용
- [ ] 대화 세션별 자동 저장 (첫 메시지 시 Conversation 생성)
- [ ] 제목 자동 생성 (첫 사용자 메시지 기반 요약)
- [ ] AI 코치 페이지에 과거 대화 목록 사이드바
  - 데스크톱: 좌측 사이드바
  - 모바일: 햄버거 메뉴
- [ ] 대화 이어하기 / 새 대화 시작

### 7-3. 모바일 반응형 최적화
- [ ] 전체 페이지 모바일 UX 점검 및 개선
- [ ] 터치 타겟 최소 44x44px 확인
- [ ] 채팅 입력창 모바일 키보드 대응 최종 점검
- [ ] 테이블/목록 모바일 카드형 레이아웃 전환 확인

### 7-4. AI 프롬프트 튜닝
- [ ] 실제 사용 기반 시스템 프롬프트 개선
- [ ] 응답 품질 평가 및 반복 개선
- [ ] 엣지 케이스 대응 (데이터 부족, 범위 밖 질문 등)

### 완료 기준 (마일스톤)
- [ ] 3개 LLM 프로바이더 모두 동작 확인
- [ ] 대시보드 차트 정상 렌더링
- [ ] 과거 대화 히스토리 조회 및 이어하기 동작
- [ ] 주변 러너에게 공유 가능한 상태

---

## Step 8: 확장 [P2]

### 8-1. Strava Webhook 자동 동기화
- [ ] Strava Webhook subscription 등록
- [ ] `app/api/strava/webhook/route.ts` (POST / GET)
  - GET: Webhook 검증 (`hub.challenge` 응답)
  - POST: `activity.create` 이벤트 수신 → 해당 활동 자동 수집
- [ ] Webhook 수신 시 해당 사용자의 새 활동 자동 DB 저장

### 8-2. 추가 LLM 프로바이더 지원
- [ ] `@ai-sdk/openai` 패키지 추가 → OpenAI 프로바이더 구현
- [ ] `@ai-sdk/anthropic` 패키지 추가 → Claude 프로바이더 구현
- [ ] 설정 UI에서 프로바이더 탭 추가 (Gemini / OpenAI / Claude)
- [ ] 프로바이더별 모델 선택:
  - OpenAI: `gpt-5.4-mini`, `gpt-5.4-nano`, `gpt-5.4-pro`
  - Claude: `claude-sonnet-4-6`, `claude-haiku-4-5`, `claude-opus-4-6`
- [ ] 채팅 API에서 활성 프로바이더에 따라 모델 동적 선택

### 8-3. 실사용자 피드백 수집
- [ ] 간단한 피드백 폼 또는 채널 안내
- [ ] 사용 패턴 분석 (어떤 기능을 많이 쓰는지)
- [ ] 피드백 기반 우선순위 조정

### 8-4. 목표 설정 기능
- [ ] 목표 유형: 거리 (10km 완주), 페이스 (5km 30분), 빈도 (주 3회)
- [ ] 목표 기한 설정 (선택)
- [ ] AI 코치 대화 시 목표 정보 시스템 프롬프트에 포함
- [ ] 대시보드에 목표 대비 진행률 표시

### 완료 기준 (마일스톤)
- [ ] Webhook으로 새 활동 자동 동기화 동작
- [ ] 실사용자 확보 및 점진적 성장
