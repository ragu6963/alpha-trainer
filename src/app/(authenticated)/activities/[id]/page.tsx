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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatMapLink(latlng: any) {
  if (Array.isArray(latlng) && latlng.length === 2 && typeof latlng[0] === 'number') {
    return `https://www.google.com/maps/search/?api=1&query=${latlng[0]},${latlng[1]}`
  }
  return null
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
  const activity = await prisma.activity.findUnique({
    where: { id },
    include: {
      laps: { orderBy: { lapIndex: 'asc' } },
    },
  })

  if (!activity || activity.userId !== dbUser.id) notFound()

  const startLink = formatMapLink(activity.startLatlng)
  const endLink = formatMapLink(activity.endLatlng)

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

        {activity.description && (
          <p className="mt-3 text-sm border-l-2 border-primary pl-3 text-muted-foreground italic">
            &quot;{activity.description}&quot;
          </p>
        )}

        {(activity.startLatlng || activity.endLatlng) && (
          <div className="flex gap-4 mt-3 text-sm text-foreground">
            {formatMapLink(activity.startLatlng) && (
              <a href={formatMapLink(activity.startLatlng)!} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                📍 시작 지점
              </a>
            )}
            {formatMapLink(activity.endLatlng) && (
              <a href={formatMapLink(activity.endLatlng)!} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                🏁 종료 지점
              </a>
            )}
          </div>
        )}
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
        {activity.calories != null && (
          <DataCard label="소모 칼로리" value={`${Math.round(activity.calories)} kcal`} />
        )}
        {activity.averageCadence != null && (
          <DataCard label="평균 케이던스" value={`${Math.round(activity.averageCadence * 2)} spm`} />
        )}
        {activity.sufferScore != null && (
          <DataCard label="훈련 스트레스(Suffer Score)" value={`${Math.round(activity.sufferScore)}`} />
        )}
      </div>

      {activity.laps.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium w-12">#</th>
                  <th className="text-left py-3 px-4 text-muted-foreground font-medium">거리</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">페이스</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">고도차이</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">시간</th>
                  <th className="text-right py-3 px-4 text-muted-foreground font-medium">심박수</th>
                </tr>
              </thead>
              <tbody>
                {activity.laps.map((lap) => (
                  <tr key={lap.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="py-2 px-4 font-medium">{lap.lapIndex}</td>
                    <td className="py-2 px-4">{formatDistanceKm(lap.distance)}</td>
                    <td className="py-2 px-4 text-right">{formatPace(lap.averageSpeed)}</td>
                    <td className="py-2 px-4 text-right">{lap.totalElevationGain?.toFixed(1) ?? '-'} m</td>
                    <td className="py-2 px-4 text-right">{formatDuration(lap.elapsedTime)}</td>
                    <td className="py-2 px-4 text-right">{lap.averageHeartrate ? Math.round(lap.averageHeartrate) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
