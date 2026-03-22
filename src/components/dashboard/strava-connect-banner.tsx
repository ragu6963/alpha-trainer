'use client'

import { Activity } from 'lucide-react'

export default function StravaConnectBanner() {
  return (
    <div className="rounded-xl border border-dashed p-4 sm:p-8 flex flex-col items-center gap-4 text-center">
      <div className="w-12 h-12 rounded-full bg-[var(--color-strava)]/10 flex items-center justify-center">
        <Activity size={24} className="text-[var(--color-strava)]" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold">Strava 연동이 필요합니다</p>
        <p className="text-sm text-muted-foreground">
          러닝 데이터를 불러오려면 Strava 계정을 연결하세요.
        </p>
      </div>
      <a
        href="/api/auth/strava"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--color-strava)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
        </svg>
        Strava 연결하기
      </a>
    </div>
  )
}
