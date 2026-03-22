import Link from 'next/link'
import { Activity, BarChart2, MessageSquare, Zap } from 'lucide-react'

export default function LandingPage() {
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

          <Link
            href="/api/auth/strava"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-white font-semibold text-base transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--color-strava)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Strava로 시작하기
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
