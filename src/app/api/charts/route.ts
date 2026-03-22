import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

type Period = '4w' | '3m' | '6m'

function getStartDate(period: Period): Date {
  const now = new Date()
  // 이번 주 월요일 기준으로 시작일 계산
  const dayOfWeek = now.getDay()
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - daysFromMonday)
  thisMonday.setHours(0, 0, 0, 0)

  if (period === '4w') {
    const d = new Date(thisMonday)
    d.setDate(thisMonday.getDate() - 21) // 4주 전 월요일
    return d
  } else if (period === '3m') {
    const d = new Date(thisMonday)
    d.setDate(thisMonday.getDate() - 77) // ~11주 전 월요일
    return d
  } else {
    const d = new Date(thisMonday)
    d.setDate(thisMonday.getDate() - 175) // ~25주 전 월요일
    return d
  }
}

/** 날짜가 속한 주의 월요일 ISO 날짜 문자열 (YYYY-MM-DD) 반환 */
function getWeekKey(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const daysFromMonday = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - daysFromMonday)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

/** 날짜가 속한 월 키 (YYYY-MM) 반환 */
function getMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7)
}

/** 주 키를 "MM/DD" 레이블로 변환 */
function weekLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  const m = d.getMonth() + 1
  const dd = d.getDate()
  return `${m}/${dd}`
}

/** 월 키를 "MM월" 레이블로 변환 */
function monthLabel(isoKey: string): string {
  const m = parseInt(isoKey.slice(5, 7))
  return `${m}월`
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) return Response.json({ error: 'USER_NOT_FOUND' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const period = (searchParams.get('period') ?? '4w') as Period

  const startDate = getStartDate(period)

  const activities = await prisma.activity.findMany({
    where: { userId: dbUser.id, startDate: { gte: startDate } },
    select: { startDate: true, distance: true, movingTime: true, averageSpeed: true },
    orderBy: { startDate: 'asc' },
  })

  // 주별 거리 및 빈도
  const weeklyDistanceMap = new Map<string, number>()
  const weeklyCountMap = new Map<string, number>()

  // 월별 평균 페이스 (초/km)
  const monthlyPaceMap = new Map<string, { totalPaceSec: number; count: number }>()

  for (const act of activities) {
    const wk = getWeekKey(act.startDate)
    weeklyDistanceMap.set(wk, (weeklyDistanceMap.get(wk) ?? 0) + act.distance)
    weeklyCountMap.set(wk, (weeklyCountMap.get(wk) ?? 0) + 1)

    const mk = getMonthKey(act.startDate)
    // averageSpeed: m/s → pace: sec/km
    const paceSec = act.averageSpeed > 0 ? 1000 / act.averageSpeed : 0
    if (paceSec > 0) {
      const prev = monthlyPaceMap.get(mk) ?? { totalPaceSec: 0, count: 0 }
      monthlyPaceMap.set(mk, { totalPaceSec: prev.totalPaceSec + paceSec, count: prev.count + 1 })
    }
  }

  // 기간 내 모든 주 목록 생성 (데이터 없는 주도 포함)
  const allWeeks: string[] = []
  const cursor = new Date(startDate)
  const now = new Date()
  while (cursor <= now) {
    allWeeks.push(getWeekKey(cursor))
    cursor.setDate(cursor.getDate() + 7)
  }
  // 중복 제거 및 정렬
  const uniqueWeeks = [...new Set(allWeeks)].sort()

  const weeklyDistance = uniqueWeeks.map((wk) => ({
    week: weekLabel(wk),
    distanceKm: parseFloat(((weeklyDistanceMap.get(wk) ?? 0) / 1000).toFixed(2)),
  }))

  const weeklyFrequency = uniqueWeeks.map((wk) => ({
    week: weekLabel(wk),
    count: weeklyCountMap.get(wk) ?? 0,
  }))

  // 월별 평균 페이스 (분:초/km 형태의 숫자 — 분 단위 소수)
  const monthKeys = [...monthlyPaceMap.keys()].sort()
  const monthlyPace = monthKeys.map((mk) => {
    const { totalPaceSec, count } = monthlyPaceMap.get(mk)!
    const avgPaceSec = totalPaceSec / count
    return {
      month: monthLabel(mk),
      paceMin: parseFloat((avgPaceSec / 60).toFixed(2)),
    }
  })

  return Response.json({ weeklyDistance, weeklyFrequency, monthlyPace })
}
