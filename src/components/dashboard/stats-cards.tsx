import { Card, CardContent } from '@/components/ui/card'

function formatDistanceKm(m: number) {
  return (m / 1000).toFixed(1) + ' km'
}

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}시간 ${m}분`
  return `${m}분`
}

export default function StatsCards({
  count,
  distanceM,
  movingTimeSec,
}: {
  count: number
  distanceM: number
  movingTimeSec: number
}) {
  const isEmpty = count === 0

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">이번 주</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard title="러닝 횟수" value={`${count}회`} />
        <StatCard title="총 거리" value={formatDistanceKm(distanceM)} />
        <StatCard title="총 시간" value={formatDuration(movingTimeSec)} />
      </div>
      {isEmpty && (
        <p className="text-sm text-muted-foreground">
          이번 주 러닝 기록이 없습니다. 오늘 한 번 달려볼까요? 💪
        </p>
      )}
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  )
}
