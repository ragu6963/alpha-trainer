import Link from 'next/link'
import { Activity, BarChart2, MessageSquare, Zap } from 'lucide-react'

const ERROR_MESSAGES: Record<string, string> = {
  google_denied: 'Google 인증이 취소되었습니다.',
  google_failed: '인증 중 오류가 발생했습니다. 다시 시도해주세요.',
  not_logged_in: '먼저 로그인이 필요합니다.',
}

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error ? ERROR_MESSAGES[error] : null

  return (
    <div className="min-h-screen flex flex-col">
      {/* 상단 바 */}
      <header className="h-16 border-b flex items-center px-4 lg:px-6">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <Activity size={20} className="text-[var(--color-strava)]" />
            Alpha Trainer
          </div>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
            달리기, 더 스마트하게
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Strava 러닝 데이터를 AI가 분석해 맞춤 코칭을 제공합니다.
            <br />
            초보 러너도 쉽게 시작할 수 있는 AI 러닝 코치입니다.
          </p>

          {errorMessage && (
            <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
              {errorMessage}
            </p>
          )}

          <Link
            href="/api/auth/google"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-white text-gray-700 font-semibold text-base border border-gray-300 shadow-sm transition-shadow hover:shadow-md"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google로 시작하기
          </Link>
        </div>

        {/* 기능 소개 */}
        <div className="mt-24 max-w-4xl w-full grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {[
            {
              icon: BarChart2,
              title: '데이터 분석',
              desc: '거리, 페이스, 심박수 등 모든 러닝 기록을 한눈에 확인하세요.',
            },
            {
              icon: MessageSquare,
              title: 'AI 코칭',
              desc: '내 데이터를 기반으로 AI가 맞춤 훈련 조언과 피드백을 드립니다.',
            },
            {
              icon: Zap,
              title: '점진적 발전',
              desc: '10% 규칙 기반의 안전한 훈련 계획으로 부상 없이 실력을 키우세요.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-xl border bg-card space-y-3">
              <Icon size={24} className="text-primary" />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* 푸터 */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © 2026 Alpha Trainer
      </footer>
    </div>
  )
}
