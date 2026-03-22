import { prisma } from '@/lib/prisma'

function formatDistanceKm(m: number) {
  return (m / 1000).toFixed(2) + 'km'
}

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}시간 ${m}분 ${s}초`
  return `${m}분 ${s}초`
}

function formatPace(speedMs: number) {
  if (speedMs <= 0) return '-'
  const paceSecPerKm = 1000 / speedMs
  const min = Math.floor(paceSecPerKm / 60)
  const sec = Math.floor(paceSecPerKm % 60)
  return `${min}'${sec.toString().padStart(2, '0')}"/km`
}

function formatDate(date: Date) {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

const DAY_NAMES_KO = ['일', '월', '화', '수', '목', '금', '토']

export async function getCoachingData(userId: string): Promise<string> {
  const now = new Date()
  const fourWeeksAgo = new Date(now)
  fourWeeksAgo.setDate(now.getDate() - 28)

  // 최근 4주 또는 최근 20회 활동 상세
  const recentActivities = await prisma.activity.findMany({
    where: {
      userId,
      startDate: { gte: fourWeeksAgo },
    },
    orderBy: { startDate: 'desc' },
    take: 20,
  })

  // 최근 4주 주별 집계
  const weeklyStats: {
    weekLabel: string
    count: number
    totalDistanceM: number
    avgPaceMs: number
  }[] = []

  for (let i = 0; i < 4; i++) {
    const weekEnd = new Date(now)
    weekEnd.setDate(now.getDate() - i * 7)
    weekEnd.setHours(23, 59, 59, 999)
    const weekStart = new Date(weekEnd)
    weekStart.setDate(weekEnd.getDate() - 6)
    weekStart.setHours(0, 0, 0, 0)

    const [count, sums] = await Promise.all([
      prisma.activity.count({ where: { userId, startDate: { gte: weekStart, lte: weekEnd } } }),
      prisma.activity.aggregate({
        where: { userId, startDate: { gte: weekStart, lte: weekEnd } },
        _sum: { distance: true, movingTime: true },
        _avg: { averageSpeed: true },
      }),
    ])

    weeklyStats.push({
      weekLabel:
        i === 0
          ? '이번 주'
          : i === 1
          ? '지난 주'
          : `${i + 1}주 전`,
      count,
      totalDistanceM: sums._sum.distance ?? 0,
      avgPaceMs: sums._avg.averageSpeed ?? 0,
    })
  }

  // 전체 요약
  const [totalCount, firstActivity, totalSums] = await Promise.all([
    prisma.activity.count({ where: { userId } }),
    prisma.activity.findFirst({ where: { userId }, orderBy: { startDate: 'asc' } }),
    prisma.activity.aggregate({
      where: { userId },
      _sum: { distance: true },
    }),
  ])

  // 텍스트 포맷 생성
  const lines: string[] = []

  // 오늘 날짜/요일 컨텍스트
  const todayStr = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
  lines.push(`[오늘] ${todayStr}`)
  lines.push('')

  lines.push('[전체 요약]')
  lines.push(`- 총 러닝 횟수: ${totalCount}회`)
  lines.push(`- 누적 거리: ${formatDistanceKm(totalSums._sum.distance ?? 0)}`)
  if (firstActivity) {
    lines.push(`- 첫 러닝: ${formatDate(firstActivity.startDate)}`)
  }
  if (totalCount === 0) {
    lines.push('- 아직 러닝 기록이 없습니다.')
  }

  lines.push('')
  lines.push('[주간 통계 (최근 4주)]')
  for (let i = 0; i < weeklyStats.length; i++) {
    const w = weeklyStats[i]
    let trendNote = ''
    if (i === 0 && weeklyStats[1]) {
      const prev = weeklyStats[1].totalDistanceM
      const curr = w.totalDistanceM
      if (prev > 0 && curr > 0) {
        const pct = Math.round(((curr - prev) / prev) * 100)
        if (pct > 0) trendNote = ` (지난 주 대비 +${pct}%)`
        else if (pct < 0) trendNote = ` (지난 주 대비 ${pct}%)`
      }
    }
    lines.push(
      `- ${w.weekLabel}: ${w.count}회, ${formatDistanceKm(w.totalDistanceM)}, 평균 페이스 ${formatPace(w.avgPaceMs)}${trendNote}`
    )
  }

  if (recentActivities.length > 0) {
    lines.push('')
    lines.push(`[최근 활동 상세 (${recentActivities.length}개)]`)
    for (const a of recentActivities) {
      const dayName = DAY_NAMES_KO[a.startDate.getDay()]
      let actLine = `- ${formatDate(a.startDate)}(${dayName}) | ${a.name} | ${formatDistanceKm(a.distance)} | ${formatDuration(a.movingTime)} | 페이스 ${formatPace(a.averageSpeed)}`
      if (a.averageHeartrate) actLine += ` | 평균 심박 ${Math.round(a.averageHeartrate)}bpm`
      if (a.totalElevationGain && a.totalElevationGain > 0) actLine += ` | 고도 +${a.totalElevationGain}m`
      if (a.averageCadence) actLine += ` | 케이던스 ${Math.round(a.averageCadence)}spm`
      lines.push(actLine)
    }
  } else {
    lines.push('')
    lines.push('[최근 활동 없음]')
    lines.push('- 최근 4주간 러닝 기록이 없습니다.')
  }

  return lines.join('\n')
}
