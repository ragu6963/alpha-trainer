import { prisma } from '@/lib/prisma'
import { GoalType } from '@/generated/prisma/enums'

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

  // 유저 목표 + 프로필 조회
  const dbUserWithGoal = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      birthYear: true,
      measuredMaxHR: true,
      goal: true,
    },
  })

  // ── 8-2 추가 데이터 ──────────────────────────────────────

  // 10% 규칙: 최근 7일 vs 이전 7일 (롤링 기준)
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(now.getDate() - 7)
  const fourteenDaysAgo = new Date(now)
  fourteenDaysAgo.setDate(now.getDate() - 14)

  const [recent7, prev7] = await Promise.all([
    prisma.activity.aggregate({
      where: { userId, startDate: { gte: sevenDaysAgo } },
      _sum: { distance: true },
    }),
    prisma.activity.aggregate({
      where: { userId, startDate: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
      _sum: { distance: true },
    }),
  ])
  const recent7km = (recent7._sum.distance ?? 0) / 1000
  const prev7km = (prev7._sum.distance ?? 0) / 1000

  // 4주 페이스 추세: 4주 전 주 vs 이번 주 (각 주 활동 2회 이상인 경우만)
  const week0 = weeklyStats[0] // 이번 주
  const week3 = weeklyStats[3] // 4주 전

  // 개인 기록 요약 (최대 3개 거리: 5km, 10km, 하프, 풀 중 기록 있는 것)
  const pbDistances = [
    { label: '5km', km: 5, tolerancePct: 10 },
    { label: '10km', km: 10, tolerancePct: 10 },
    { label: '하프마라톤', km: 21.1, tolerancePct: 5 },
    { label: '풀마라톤', km: 42.195, tolerancePct: 5 },
  ]

  const pbResults: { label: string; pace: string; date: string }[] = []
  for (const d of pbDistances) {
    const targetM = d.km * 1000
    const toleranceM = targetM * (d.tolerancePct / 100)
    const best = await prisma.activity.findFirst({
      where: {
        userId,
        distance: { gte: targetM - toleranceM, lte: targetM + toleranceM },
      },
      orderBy: { averageSpeed: 'desc' },
      select: { averageSpeed: true, startDate: true },
    })
    if (best) {
      pbResults.push({
        label: d.label,
        pace: formatPace(best.averageSpeed),
        date: best.startDate.toISOString().slice(0, 10),
      })
      if (pbResults.length >= 3) break
    }
  }

  // 훈련 강도 분포: 최근 10개 활동 (HR 우선, 없으면 페이스 기준)
  const last10 = recentActivities.slice(0, 10)
  let hardCount = 0
  let easyCount = 0
  let intensityBasis = 'HR 기반'

  // 4주 평균 페이스 계산 (HR 없을 때 기준)
  const allRecentSpeeds = recentActivities.map((a) => a.averageSpeed).filter((s) => s > 0)
  const avgSpeedAll =
    allRecentSpeeds.length > 0
      ? allRecentSpeeds.reduce((a, b) => a + b, 0) / allRecentSpeeds.length
      : 0
  // avgSpeedAll m/s → paceSecPerKm: 1000/avgSpeedAll
  const avgPaceSecAll = avgSpeedAll > 0 ? 1000 / avgSpeedAll : 0

  const hrActivities = last10.filter((a) => a.averageHeartrate && a.maxHeartrate)
  if (hrActivities.length >= last10.length * 0.5 && last10.length > 0) {
    // HR 기반 분류: maxHeartrate의 76% 이상 → hard
    for (const a of last10) {
      if (a.averageHeartrate && a.maxHeartrate) {
        if (a.averageHeartrate >= a.maxHeartrate * 0.76) hardCount++
        else easyCount++
      } else if (avgSpeedAll > 0) {
        // HR 없는 활동은 페이스로 보조
        const actPaceSec = a.averageSpeed > 0 ? 1000 / a.averageSpeed : 0
        if (actPaceSec > 0 && actPaceSec < avgPaceSecAll * 0.95) hardCount++
        else easyCount++
      }
    }
    intensityBasis = 'HR 기반'
  } else if (last10.length > 0 && avgSpeedAll > 0) {
    // 페이스 기반 분류: 평균 대비 5% 이상 빠르면 hard
    for (const a of last10) {
      const actPaceSec = a.averageSpeed > 0 ? 1000 / a.averageSpeed : 0
      if (actPaceSec > 0 && actPaceSec < avgPaceSecAll * 0.95) hardCount++
      else easyCount++
    }
    intensityBasis = '페이스 기반'
  }

  // ─────────────────────────────────────────────────────────

  // 텍스트 포맷 생성
  const lines: string[] = []

  // 오늘 날짜/요일 컨텍스트
  const todayStr = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
  lines.push(`## 오늘`)
  lines.push(todayStr)
  lines.push('')

  lines.push('## 전체 요약')
  lines.push(`- 총 러닝 횟수: ${totalCount}회`)
  lines.push(`- 누적 거리: ${formatDistanceKm(totalSums._sum.distance ?? 0)}`)
  if (firstActivity) {
    lines.push(`- 첫 러닝: ${formatDate(firstActivity.startDate)}`)
  }
  if (totalCount === 0) {
    lines.push('- 아직 러닝 기록이 없습니다.')
  }

  lines.push('')
  lines.push('## 주간 통계 (최근 4주)')
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

  // 10% 규칙
  lines.push('')
  lines.push('## 10% 규칙 체크 (최근 7일 vs 이전 7일)')
  if (prev7km > 0) {
    const pct = Math.round((recent7km / prev7km) * 100)
    const status = pct <= 110 ? '안전 범위' : pct <= 130 ? '주의' : '과부하'
    lines.push(`- 이전 7일: ${prev7km.toFixed(2)}km / 최근 7일: ${recent7km.toFixed(2)}km → ${pct}% (${status})`)
  } else {
    lines.push(`- 이전 7일: ${prev7km.toFixed(2)}km / 최근 7일: ${recent7km.toFixed(2)}km → 이전 기록 없음`)
  }

  // 4주 페이스 추세
  lines.push('')
  lines.push('## 페이스 추세')
  if (week0.count >= 2 && week3.count >= 2 && week0.avgPaceMs > 0 && week3.avgPaceMs > 0) {
    const pace0Sec = 1000 / week0.avgPaceMs
    const pace3Sec = 1000 / week3.avgPaceMs
    const diffSec = Math.round(pace3Sec - pace0Sec)
    const direction = diffSec > 0 ? `+${diffSec}초 향상` : diffSec < 0 ? `${Math.abs(diffSec)}초 저하` : '동일'
    lines.push(`4주 전 ${formatPace(week3.avgPaceMs)} (${week3.count}회) → 이번 주 ${formatPace(week0.avgPaceMs)} (${week0.count}회) (${direction})`)
  } else {
    lines.push('데이터 부족 (각 주 최소 2회 이상 필요)')
  }

  // 개인 기록
  if (pbResults.length > 0) {
    lines.push('')
    lines.push('## 개인 기록')
    for (const pb of pbResults) {
      lines.push(`- ${pb.label}: ${pb.pace}/km 페이스 (${pb.date})`)
    }
  }

  // 훈련 강도 분포
  if (last10.length > 0 && (hardCount + easyCount) > 0) {
    lines.push('')
    lines.push(`## 훈련 강도 분포 (최근 ${last10.length}회, ${intensityBasis})`)
    lines.push(`- hard: ${hardCount}회 / easy: ${easyCount}회`)
  }

  if (recentActivities.length > 0) {
    lines.push('')
    lines.push(`## 최근 활동 상세 (${recentActivities.length}개)`)
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
    lines.push('## 최근 활동 없음')
    lines.push('- 최근 4주간 러닝 기록이 없습니다.')
  }

  // 러너 프로필 (8-5)
  if (dbUserWithGoal?.birthYear || dbUserWithGoal?.measuredMaxHR) {
    lines.push('')
    lines.push('## 러너 프로필')
    if (dbUserWithGoal.birthYear) {
      lines.push(`- 출생연도: ${dbUserWithGoal.birthYear}년 (${now.getFullYear() - dbUserWithGoal.birthYear}세)`)
    }
    if (dbUserWithGoal.measuredMaxHR) {
      lines.push(`- 최대 심박수: ${dbUserWithGoal.measuredMaxHR}bpm (직접 측정)`)
    } else if (dbUserWithGoal.birthYear) {
      const estimatedMaxHR = 220 - (now.getFullYear() - dbUserWithGoal.birthYear)
      lines.push(`- 최대 심박수 추정: ${estimatedMaxHR}bpm (220-나이 공식)`)
    }
  }

  // 훈련 목표 (8-3)
  const goal = dbUserWithGoal?.goal
  if (goal) {
    lines.push('')
    lines.push('## 훈련 목표')
    const goalTypeLabels: Record<GoalType, string> = {
      race_completion: '레이스 완주',
      pace_improvement: '페이스 단축',
      distance_increase: '거리 늘리기',
      frequency: '빈도 증가',
    }
    lines.push(`- 목표 유형: ${goalTypeLabels[goal.goalType]}`)
    if (goal.targetRaceName) lines.push(`- 목표 레이스: ${goal.targetRaceName}`)
    if (goal.targetDistanceKm) lines.push(`- 목표 거리: ${goal.targetDistanceKm}km`)
    if (goal.targetRaceDate) {
      // KST 기준 D-day 계산
      const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
      const kstRace = new Date(goal.targetRaceDate.getTime() + 9 * 60 * 60 * 1000)
      const kstNowDate = new Date(kstNow.toISOString().slice(0, 10))
      const kstRaceDate = new Date(kstRace.toISOString().slice(0, 10))
      const dDay = Math.round((kstRaceDate.getTime() - kstNowDate.getTime()) / (1000 * 60 * 60 * 24))
      const raceDateStr = goal.targetRaceDate.toISOString().slice(0, 10)
      lines.push(`- 목표 날짜: ${raceDateStr} (D-${dDay})`)
    }
    if (goal.targetFinishTime) lines.push(`- 목표 완주 시간: ${goal.targetFinishTime}`)
    if (goal.weeklyDistanceGoalKm) lines.push(`- 주간 목표 거리: ${goal.weeklyDistanceGoalKm}km`)
    if (goal.weeklyRunCountGoal) lines.push(`- 주간 목표 횟수: ${goal.weeklyRunCountGoal}회`)
    if (goal.memo) lines.push(`- 메모: ${goal.memo}`)
  }

  return lines.join('\n')
}
