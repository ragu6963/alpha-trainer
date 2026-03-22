# 기능 요구서: AI 러닝 코치

> 상위 문서: [prd.md](prd.md)

## 1. 인증 및 사용자 관리

### 1.1 Strava OAuth 연동 [P0]
* **설명**: Strava OAuth 2.0을 통한 사용자 인증 및 API 접근 권한 획득
* **상세 요구사항**:
  - "Strava로 시작하기" 버튼 클릭 시 Strava 인증 페이지로 리다이렉트
  - 인증 완료 후 콜백으로 access_token, refresh_token 수신
  - 토큰을 Supabase DB에 암호화 저장
  - access_token 만료 시 refresh_token으로 자동 갱신
  - 갱신 실패 시 사용자에게 재인증 안내 UI 표시
* **인증 흐름**:
  1. 사용자가 "Strava로 시작하기" 클릭 → Strava OAuth 인증 페이지로 리다이렉트
  2. Strava 인증 완료 → 콜백에서 Strava access_token, refresh_token 수신
  3. Strava athlete_id 기반으로 Supabase Auth에 사용자 생성 (signUp) 또는 로그인 (signInWithPassword)
  4. Supabase 세션 (JWT) 발급 → 클라이언트에 세션 쿠키 설정
  5. Strava 토큰은 DB User 테이블에 별도 저장 (API 호출용)
* **API**: `POST https://www.strava.com/oauth/token`
* **저장 데이터**: athlete_id, access_token, refresh_token, expires_at
* **경로**: `/api/auth/strava`, `/api/auth/strava/callback`

### 1.2 사용자 세션 관리 [P0]
* **설명**: Supabase Auth 기반 세션 관리 (다수 사용자 지원)
* **상세 요구사항**:
  - Strava OAuth 완료 후 Supabase에 custom access token 발급하여 세션 생성
  - JWT 기반 세션 유지 (Supabase Auth가 발급한 JWT 사용)
  - 로그아웃 시 세션 무효화
  - 각 사용자의 데이터는 완전히 격리 (Row Level Security)
* **경로**: 미들웨어에서 전역 처리

### 1.3 사용자 데이터 삭제 (계정 탈퇴) [P0]
* **설명**: 사용자가 본인의 모든 데이터를 삭제하고 계정을 탈퇴할 수 있는 기능
* **상세 요구사항**:
  - 설정 페이지에서 "계정 삭제" 버튼 제공
  - 삭제 전 확인 다이얼로그 (되돌릴 수 없음 안내)
  - 삭제 대상: User, Activity, Conversation, Message, UserLLMKey 등 관련 데이터 전체
  - Supabase Auth 사용자도 함께 삭제
  - Strava OAuth 연동 해제 (revoke)
* **경로**: `/api/auth/delete-account` (DELETE)

---

## 2. 러닝 데이터 수집 및 저장

### 2.1 Strava 활동 데이터 수집 [P0]
* **설명**: Strava API를 통해 사용자의 러닝 활동 기록 가져오기
* **상세 요구사항**:
  - 최초 연동 시 모든 활동 일괄 수집
  - 활동 타입 필터링: `Run` 타입만 수집
  - 페이지네이션 처리 (Strava API 기본 30개/페이지)
  - Rate limit 준수 (15분당 100회, 일 1,000회), 초과 시 남은 대기 시간 안내 + 자동 재시도 큐
  - 수집 진행률 UI 표시 (프로그레스 바)
* **API**: `GET https://www.strava.com/api/v3/athlete/activities`
* **수집 필드**:
  - `id`, `name`, `distance` (미터), `moving_time` (초), `elapsed_time` (초)
  - `start_date`, `average_speed`, `max_speed`
  - `average_heartrate`, `max_heartrate` (심박수 데이터 있는 경우)
  - `total_elevation_gain`, `elev_high`, `elev_low`
  - `start_latlng`, `end_latlng`
* **경로**: `/api/strava/sync`

### 2.2 데이터 저장 스키마 [P0]
* **설명**: Prisma 스키마로 러닝 데이터 구조화 저장

```prisma
model User {
  id              String     @id @default(uuid())
  supabaseId      String     @unique
  stravaAthleteId Int        @unique
  accessToken     String
  refreshToken    String
  tokenExpiresAt  DateTime
  lastSyncedAt    DateTime?  // 마지막 동기화 시각 (수동 동기화 및 UI 표시용)
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt
  activities      Activity[]
  conversations   Conversation[]
  llmKeys         UserLLMKey[]
}

model Activity {
  id                 String   @id @default(uuid())
  stravaActivityId   BigInt   @unique  // 주의: JSON 직렬화 시 BigInt → String 변환 필요
  userId             String
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name               String
  distance           Float    // 미터
  movingTime         Int      // 초
  elapsedTime        Int      // 초
  startDate          DateTime
  averageSpeed       Float    // m/s
  maxSpeed           Float    // m/s
  averageHeartrate   Float?   // bpm (optional)
  maxHeartrate       Float?   // bpm (optional)
  totalElevationGain Float    // 미터
  elevHigh           Float?   // 최고 고도 (미터)
  elevLow            Float?   // 최저 고도 (미터)
  startLatlng        Json?    // [lat, lng]
  endLatlng          Json?    // [lat, lng]
  createdAt          DateTime @default(now())
}
```

### 2.3 자동 동기화 (Strava Webhook) [P1]
* **설명**: Strava Webhook으로 새 활동 자동 수신
* **상세 요구사항**:
  - Strava Webhook subscription 등록
  - `activity.create` 이벤트 수신 시 해당 활동 자동 수집
  - Webhook 검증 (hub.challenge 응답)
* **경로**: `/api/strava/webhook`

### 2.4 수동 동기화 [P0]
* **설명**: 사용자가 직접 최신 데이터 동기화 트리거
* **상세 요구사항**:
  - "동기화" 버튼 클릭 시 마지막 동기화 이후 새 활동 수집
  - 동기화 중 로딩 상태 표시
  - 새로 추가된 활동 수 표시
* **경로**: `/api/strava/sync` (POST)

---

## 3. 대시보드

### 3.1 러닝 기록 요약 [P0]
* **설명**: 최근 러닝 기록 및 기본 통계 표시
* **상세 요구사항**:
  - 최근 활동 목록 (최신순, 10개씩 페이지네이션)
  - 각 활동: 날짜, 거리(km), 시간, 평균 페이스(분'초"/km) 표시
  - 이번 주 요약: 총 러닝 횟수, 총 거리, 총 시간
  - 마지막 동기화 시각 표시
* **경로**: `/dashboard`

### 3.2 주간/월간 통계 차트 [P1]
* **설명**: Recharts 기반 러닝 통계 시각화
* **상세 요구사항**:
  - 주간 거리 추이 (막대 차트)
  - 월간 페이스 변화 (라인 차트)
  - 주간 러닝 빈도 (캘린더 히트맵 또는 막대)
  - 기간 선택: 최근 4주 / 3개월 / 6개월
* **경로**: `/dashboard` (탭 또는 섹션)

### 3.3 활동 상세 [P0]
* **설명**: 개별 러닝 활동의 상세 정보 표시
* **상세 요구사항**:
  - 거리, 시간, 페이스, 심박수, 고도 등 전체 데이터 표시
  - km별 페이스 분할 (Strava API의 laps 데이터 활용 가능 시)
* **경로**: `/activities/[id]`

---

## 4. LLM API 키 관리

### 4.1 API 키 등록 [P0]
* **설명**: 사용자가 본인의 LLM API 키를 직접 등록하여 AI 코치 사용
* **MVP 지원 프로바이더**:
  - **Google Gemini** (Gemini 3.1 Flash, Gemini 3.1 Flash Lite, Gemini 3.1 Pro) — MVP에서 우선 지원
* **P1 추가 프로바이더**:
  - **OpenAI** (GPT-5.4 mini, GPT-5.4 nano, GPT-5.4 Pro 등)
  - **Anthropic Claude** (Claude Sonnet 4.6, Claude Haiku 4.5, Claude Opus 4.6 등)
* **상세 요구사항**:
  - 설정 페이지에서 프로바이더별 API 키 입력 폼
  - API 키는 서버 측 암호화 저장 (Supabase Vault 사용 — 별도 encryption key 관리 불필요)
  - 키 등록 시 유효성 검증 (테스트 API 호출로 확인)
  - 키 마스킹 표시 (예: `sk-...abc1`)
  - 키 삭제/교체 기능
  - 사용할 프로바이더 및 모델 선택 드롭다운
* **경로**: `/settings` (API 키 섹션)
* **API**: `/api/settings/llm-key` (POST/DELETE)

### 4.2 프로바이더 추상화 [P0 Gemini / P1 OpenAI, Claude]
* **설명**: Vercel AI SDK를 활용한 LLM 프로바이더 통합
* **상세 요구사항**:
  - Vercel AI SDK의 `streamText` / `generateText` 사용으로 프로바이더 추상화
  - MVP에서는 `@ai-sdk/google` 어댑터만 구현
  - P1에서 `@ai-sdk/openai`, `@ai-sdk/anthropic` 어댑터 추가
  - Next.js App Router의 Route Handler에서 `ReadableStream` 반환 (SSE 대신)
  - API 키 오류, 잔액 부족, rate limit 등 에러를 통일된 형태로 반환

```typescript
// Vercel AI SDK 기반 구현 예시
import { streamText } from 'ai';
import { google } from '@ai-sdk/google';

// MVP: Gemini만 지원
const result = streamText({
  model: google('gemini-3.1-flash', { apiKey: userApiKey }),
  system: systemPrompt,
  messages,
});

// P1: 프로바이더 선택
type ProviderType = 'openai' | 'gemini' | 'claude';
```

```prisma
model UserLLMKey {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider     String   // "openai" | "gemini" | "claude"
  encryptedKey String
  isActive     Boolean  @default(false)
  model        String?  // 선택된 모델 (예: "gemini-3.1-flash", "gpt-5.4-mini", "claude-sonnet-4-6")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([userId, provider])
}
```

---

## 5. AI 코치

### 5.1 채팅 인터페이스 [P0]
* **설명**: 사용자가 선택한 LLM 프로바이더 기반 자연어 코칭 채팅
* **진입 흐름**:
  - `/coach` 접속 시 바로 채팅창이 아닌 **3개 선택지** 화면 표시:
    1. **내일 훈련 추천** — 선택 시 "내일 훈련 계획을 추천해줘" 프롬프트로 자동 채팅 시작
    2. **주간 훈련 추천** — 선택 시 "이번 주 훈련 계획을 추천해줘" 프롬프트로 자동 채팅 시작
    3. **대화하기** — 선택 시 빈 채팅창으로 진입 (자유 대화)
  - 선택지 선택 후 채팅 UI로 전환, 이후 흐름은 동일
* **상세 요구사항**:
  - 채팅 UI: 메시지 입력창 + 대화 버블 (사용자/AI 구분)
  - 스트리밍 응답 (Vercel AI SDK의 ReadableStream 기반)
  - 타이핑 인디케이터 표시
  - 마크다운 렌더링 지원 (리스트, 볼드 등)
  - 대화 시작 시 최근 러닝 데이터를 시스템 프롬프트에 자동 포함
  - API 키 미등록 시 설정 페이지로 안내
  - 현재 사용 중인 프로바이더/모델 표시
* **경로**: `/coach`
* **API**: `/api/coach/chat` (POST, streaming)

### 5.2 시스템 프롬프트 설계 [P0]
* **설명**: AI 코치의 역할과 컨텍스트 정의 (프로바이더 공통)
* **시스템 프롬프트 구성**:
  - 역할: 초보 러너를 위한 친근한 AI 러닝 코치
  - 원칙: 안전 우선, 점진적 발전, 10% 규칙 (주간 거리 증가 10% 이내)
  - 컨텍스트: 러닝 데이터 (아래 5.3 데이터 범위 정책에 따라 자동 포함)
  - 응답 스타일: 한국어, 격려적 톤, 구체적 수치 기반 조언
  - 범위 제한: 러닝 관련 질문에만 응답
* **참고**: 시스템 프롬프트는 프로바이더 무관하게 동일하게 적용

### 5.3 코칭 데이터 범위 정책 [P0]
* **설명**: AI 코치에게 제공되는 러닝 데이터의 범위 정의
* **방식**: 기본 자동 (고정 범위) — 사용자 설정 없이 즉시 사용 가능
* **시스템 프롬프트에 포함되는 데이터**:

| 데이터 | 범위 | 용도 |
|--------|------|------|
| 최근 활동 상세 | 최근 4주 또는 최근 20회 (먼저 도달하는 기준) | 개별 활동의 거리, 페이스, 심박수, 고도 등 |
| 주간 집계 통계 | 최근 4주, 주별 | 주당 총 거리, 러닝 횟수, 평균 페이스 추이 |
| 전체 요약 (1줄) | 전 기간 | 총 활동 수, 첫 활동일, 누적 거리 |

* **설계 근거**:
  - 초보 러너는 어떤 범위가 적절한지 판단하기 어려움 → 자동이 최선
  - 대부분의 코칭 질문 (이번 주 훈련, 페이스 변화, 부상 예방)은 4주 데이터로 충분
  - 전체 요약이 있으므로 "나 많이 늘었어?" 같은 장기 질문에도 대응 가능
  - 시스템 프롬프트 토큰 사용량을 예측 가능하게 관리
* **P1 확장**: 사용자가 "최근 3개월 분석해줘" 등 명시적으로 넓은 범위를 요청할 경우, 해당 범위의 데이터를 추가로 조회하여 컨텍스트에 포함

### 5.4 훈련 계획 생성 [P0]
* **설명**: 사용자 기록 기반 맞춤 훈련 추천
* **상세 요구사항**:
  - 5.3 데이터 범위 정책에 따라 자동 포함된 데이터 기반으로 분석
  - 주간 훈련 계획 (요일별 거리, 강도, 유형) 제시
  - 이전 추천 대비 실행 결과 반영 (대화 컨텍스트)
  - 부상 예방 관점의 주의사항 포함

### 5.5 대화 히스토리 [P1]
* **설명**: 과거 AI 코칭 대화 저장 및 조회
* **상세 요구사항**:
  - 대화 세션별 저장 (제목 자동 생성)
  - 과거 대화 목록 사이드바
  - 대화 이어하기 / 새 대화 시작 선택

```prisma
model Conversation {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String?
  provider  String?   // 대화 시 사용된 프로바이더 ("openai" | "gemini" | "claude")
  model     String?   // 대화 시 사용된 모델 (예: "gemini-3.1-flash")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  Message[]
}

model Message {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           String       // "user" | "assistant"
  content        String
  createdAt      DateTime     @default(now())
}
```

---

## 6. 설정

### 6.1 Strava 연동 관리 [P0]
* **설명**: Strava 연결 상태 확인 및 관리
* **상세 요구사항**:
  - 연결된 Strava 계정 정보 표시
  - 연결 해제 기능
  - 토큰 상태 표시 (유효/만료)
* **경로**: `/settings`

### 6.2 LLM API 키 관리 [P0]
* **설명**: LLM 프로바이더 API 키 등록/관리 UI
* **상세 요구사항**:
  - 상세 스펙은 4.1 참조
  - Strava 연동과 함께 설정 페이지 내 탭 또는 섹션으로 구성

### 6.3 계정 삭제 [P0]
* **설명**: 사용자 데이터 삭제 및 계정 탈퇴
* **상세 요구사항**:
  - 상세 스펙은 1.3 참조
  - 설정 페이지 내 "위험 영역" 섹션으로 구성

### 6.4 목표 설정 [P2]
* **설명**: 개인 러닝 목표 입력
* **상세 요구사항**:
  - 목표 유형: 거리(예: 10km 완주), 페이스(예: 5km 30분), 빈도(예: 주 3회)
  - 목표 기한 설정 (선택)
  - AI 코치 대화 시 목표 정보 컨텍스트에 포함

---

## 7. 반응형 디자인 [P0]

### 7.1 브레이크포인트
* **설명**: Tailwind CSS 기본 브레이크포인트 기반 모바일/태블릿/데스크톱 대응
* **기준**:
  - 모바일: `< 768px` (기본, mobile-first)
  - 태블릿: `768px ~ 1023px` (`md`)
  - 데스크톱: `1024px+` (`lg`)

### 7.2 페이지별 반응형 레이아웃
| 페이지 | 모바일 | 데스크톱 |
|--------|--------|----------|
| 대시보드 | 통계 카드 세로 스택, 활동 목록 풀 너비 | 통계 카드 가로 그리드 (3열), 활동 목록 + 사이드 요약 |
| AI 코치 | 채팅 풀스크린, 히스토리는 햄버거 메뉴 | 사이드바(대화 목록) + 메인(채팅) 2컬럼 |
| 활동 상세 | 데이터 항목 세로 나열 | 데이터 카드 그리드 + 차트 가로 배치 |
| 설정 | 탭 세로 스택 | 사이드 탭 + 메인 콘텐츠 |

### 7.3 공통 UI 요구사항
* **상세 요구사항**:
  - 네비게이션: 데스크톱 상단 바 → 모바일 하단 탭 바
  - 터치 타겟: 모바일에서 최소 44x44px
  - 채팅 입력창: 모바일에서 키보드 올라올 때 입력창 고정 (sticky bottom)
  - 차트: 모바일에서 가로 스크롤 또는 간소화된 뷰
  - 테이블/목록: 모바일에서 카드형 레이아웃으로 전환
  - viewport meta 태그 설정 (`width=device-width, initial-scale=1`)

---

## 8. 페이지 및 API 경로 요약

### 페이지 (App Router)
| 경로 | 설명 | 인증 필요 |
|------|------|-----------|
| `/` | 랜딩 페이지 | No |
| `/dashboard` | 대시보드 | Yes |
| `/coach` | AI 코치 채팅 | Yes |
| `/activities/[id]` | 활동 상세 | Yes |
| `/settings` | 설정 (Strava 연동, LLM API 키) | Yes |

### API Routes
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/auth/strava` | Strava OAuth 시작 |
| GET | `/api/auth/strava/callback` | OAuth 콜백 처리 |
| DELETE | `/api/auth/delete-account` | 계정 삭제 (전체 데이터 삭제 + Strava 연동 해제) |
| POST | `/api/strava/sync` | 수동 데이터 동기화 |
| POST/GET | `/api/strava/webhook` | Strava Webhook 수신 [P1] |
| POST | `/api/coach/chat` | AI 코치 대화 (streaming) |
| POST | `/api/settings/llm-key` | LLM API 키 등록/검증 |
| DELETE | `/api/settings/llm-key` | LLM API 키 삭제 |
| GET | `/api/activities` | 활동 목록 조회 |
| GET | `/api/activities/[id]` | 활동 상세 조회 |
| GET | `/api/stats` | 통계 데이터 조회 |
