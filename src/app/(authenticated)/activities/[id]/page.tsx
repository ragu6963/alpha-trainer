import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'

function formatDistanceKm(m: number) {
  return (m / 1000).toFixed(2) + ' km'
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
  return `${min}'${sec.toString().padStart(2, '0')}"/km`
}

function formatDate(date: Date) {
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DataCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  )
}

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) redirect('/')

  const { id } = await params
  const activity = await prisma.activity.findUnique({ where: { id } })

  if (!activity || activity.userId !== dbUser.id) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← 대시보드
        </Link>
        <h1 className="text-2xl font-bold mt-2">{activity.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">{formatDate(activity.startDate)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <DataCard label="거리" value={formatDistanceKm(activity.distance)} />
        <DataCard label="이동 시간" value={formatDuration(activity.movingTime)} />
        <DataCard label="경과 시간" value={formatDuration(activity.elapsedTime)} />
        <DataCard label="평균 페이스" value={formatPace(activity.averageSpeed)} />
        <DataCard label="최고 페이스" value={formatPace(activity.maxSpeed)} />
        <DataCard label="총 고도 상승" value={`${activity.totalElevationGain.toFixed(0)} m`} />
        {activity.elevHigh != null && (
          <DataCard label="최고 고도" value={`${activity.elevHigh.toFixed(0)} m`} />
        )}
        {activity.elevLow != null && (
          <DataCard label="최저 고도" value={`${activity.elevLow.toFixed(0)} m`} />
        )}
        {activity.averageHeartrate != null && (
          <DataCard label="평균 심박수" value={`${Math.round(activity.averageHeartrate)} bpm`} />
        )}
        {activity.maxHeartrate != null && (
          <DataCard label="최고 심박수" value={`${Math.round(activity.maxHeartrate)} bpm`} />
        )}
      </div>
    </div>
  )
}
