'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export type ActivityItem = {
  id: string
  name: string
  startDate: string
  distance: number
  movingTime: number
  averageSpeed: number
}

function formatDistanceKm(m: number) {
  return (m / 1000).toFixed(1) + ' km'
}

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatPace(speedMs: number) {
  if (speedMs <= 0) return '-'
  const paceSecPerKm = 1000 / speedMs
  const min = Math.floor(paceSecPerKm / 60)
  const sec = Math.floor(paceSecPerKm % 60)
  return `${min}'${sec.toString().padStart(2, '0')}"`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

export default function ActivityList({
  initialActivities,
  initialTotal,
  initialTotalPages,
}: {
  initialActivities: ActivityItem[]
  initialTotal: number
  initialTotalPages: number
}) {
  const [activities, setActivities] = useState(initialActivities)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)

  async function goToPage(nextPage: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/activities?page=${nextPage}`)
      if (!res.ok) return
      const data = (await res.json()) as {
        activities: ActivityItem[]
        total: number
        page: number
        totalPages: number
      }
      setActivities(data.activities)
      setPage(data.page)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }

  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center space-y-2">
        <p className="text-sm font-medium">아직 러닝 기록이 없습니다</p>
        <p className="text-xs text-muted-foreground">
          위의 동기화 버튼을 눌러 Strava 활동을 불러오세요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">최근 활동</h2>

      {/* 데스크톱: 테이블형 */}
      <div className="hidden sm:block rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">날짜</th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">활동명</th>
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">거리</th>
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">시간</th>
              <th className="text-right px-4 py-2 font-medium text-muted-foreground">페이스</th>
            </tr>
          </thead>
          <tbody className={loading ? 'opacity-50' : ''}>
            {activities.map((a) => (
              <tr
                key={a.id}
                className="border-t hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3 text-muted-foreground">{formatDate(a.startDate)}</td>
                <td className="px-4 py-3">
                  <Link href={`/activities/${a.id}`} className="hover:underline font-medium">
                    {a.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">{formatDistanceKm(a.distance)}</td>
                <td className="px-4 py-3 text-right">{formatDuration(a.movingTime)}</td>
                <td className="px-4 py-3 text-right">{formatPace(a.averageSpeed)}/km</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일: 카드형 */}
      <div className={`sm:hidden space-y-2 ${loading ? 'opacity-50' : ''}`}>
        {activities.map((a) => (
          <Link key={a.id} href={`/activities/${a.id}`}>
            <Card className="hover:bg-muted/30 transition-colors">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(a.startDate)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">{formatPace(a.averageSpeed)}/km</p>
                </div>
                <div className="flex gap-3 mt-2 text-sm text-muted-foreground">
                  <span>{formatDistanceKm(a.distance)}</span>
                  <span>{formatDuration(a.movingTime)}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {total}개 중 {(page - 1) * 10 + 1}–{Math.min(page * 10, total)}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || loading}
            >
              이전
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages || loading}
            >
              다음
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
