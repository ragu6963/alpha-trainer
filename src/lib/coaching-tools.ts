import { tool } from 'ai'
import { z } from 'zod'
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

export function buildCoachingTools(userId: string) {
  return {
    getRecentActivities: tool({
      description:
        '사용자의 최근 러닝 활동 목록을 조회합니다. 특정 기간이나 횟수 기반으로 조회할 수 있습니다.',
      inputSchema: z.object({
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe('조회할 최대 활동 수 (기본 10, 최대 50)'),
        days: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .describe('최근 N일 이내 활동만 조회 (기본 제한 없음)'),
      }),
      execute: async ({ limit = 10, days }) => {
        const where: { userId: string; startDate?: { gte: Date } } = { userId }
        if (days) {
          const since = new Date()
          since.setDate(since.getDate() - days)
          where.startDate = { gte: since }
        }

        const activities = await prisma.activity.findMany({
          where,
          orderBy: { startDate: 'desc' },
          take: limit,
          select: {
            id: true,
            name: true,
            distance: true,
            movingTime: true,
            startDate: true,
            averageSpeed: true,
            averageHeartrate: true,
            maxHeartrate: true,
            totalElevationGain: true,
            averageCadence: true,
          },
        })

        if (activities.length === 0) {
          return { result: '해당 조건의 활동이 없습니다.', activities: [] }
        }

        return {
          count: activities.length,
          activities: activities.map((a) => ({
            id: a.id,
            date: formatDate(a.startDate),
            name: a.name,
            distance: formatDistanceKm(a.distance),
            duration: formatDuration(a.movingTime),
            pace: formatPace(a.averageSpeed),
            avgHr: a.averageHeartrate ? `${Math.round(a.averageHeartrate)}bpm` : null,
            maxHr: a.maxHeartrate ? `${Math.round(a.maxHeartrate)}bpm` : null,
            elevation: a.totalElevationGain > 0 ? `+${a.totalElevationGain}m` : null,
            cadence: a.averageCadence ? `${Math.round(a.averageCadence)}spm` : null,
          })),
        }
      },
    }),

    getActivityStats: tool({
      description:
        '기간별 러닝 통계를 집계합니다. 주간 또는 월간 단위로 거리·횟수·평균 페이스를 확인할 수 있습니다.',
      inputSchema: z.object({
        periodDays: z
          .number()
          .int()
          .min(7)
          .max(365)
          .describe('집계할 기간 (일 단위, 예: 28=4주, 90=3개월)'),
        groupBy: z
          .enum(['week', 'month', 'total'])
          .describe('집계 단위: week(주간), month(월간), total(전체 합산)'),
      }),
      execute: async ({ periodDays, groupBy }) => {
        const since = new Date()
        since.setDate(since.getDate() - periodDays)

        const activities = await prisma.activity.findMany({
          where: { userId, startDate: { gte: since } },
          orderBy: { startDate: 'asc' },
          select: {
            distance: true,
            movingTime: true,
            averageSpeed: true,
            startDate: true,
          },
        })

        if (activities.length === 0) {
          return { result: `최근 ${periodDays}일간 활동이 없습니다.` }
        }

        if (groupBy === 'total') {
          const totalDist = activities.reduce((s: number, a) => s + a.distance, 0)
          const totalTime = activities.reduce((s: number, a) => s + a.movingTime, 0)
          const avgSpeed = activities.reduce((s: number, a) => s + a.averageSpeed, 0) / activities.length
          return {
            period: `최근 ${periodDays}일`,
            count: activities.length,
            totalDistance: formatDistanceKm(totalDist),
            totalDuration: formatDuration(totalTime),
            avgPace: formatPace(avgSpeed),
          }
        }

        const groups = new Map<string, typeof activities>()
        for (const a of activities) {
          let key: string
          if (groupBy === 'week') {
            const d = new Date(a.startDate)
            const dayOfWeek = d.getDay()
            const monday = new Date(d)
            monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7))
            key = monday.toISOString().slice(0, 10)
          } else {
            key = a.startDate.toISOString().slice(0, 7)
          }
          if (!groups.has(key)) groups.set(key, [])
          groups.get(key)!.push(a)
        }

        const stats = Array.from(groups.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, acts]) => {
            const totalDist = acts.reduce((s: number, a) => s + a.distance, 0)
            const totalTime = acts.reduce((s: number, a) => s + a.movingTime, 0)
            const avgSpeed = acts.reduce((s: number, a) => s + a.averageSpeed, 0) / acts.length
            return {
              period: groupBy === 'week' ? `${key} 주` : key,
              count: acts.length,
              totalDistance: formatDistanceKm(totalDist),
              totalDuration: formatDuration(totalTime),
              avgPace: formatPace(avgSpeed),
            }
          })

        return { groupBy, stats }
      },
    }),

    getPersonalBests: tool({
      description:
        '특정 거리(5km, 10km, 하프, 풀마라톤 등)에 가장 가까운 활동 중 최고 기록을 조회합니다.',
      inputSchema: z.object({
        distanceKm: z
          .number()
          .min(1)
          .max(100)
          .describe('기준 거리 (km). 예: 5, 10, 21.1, 42.195'),
        tolerancePct: z
          .number()
          .min(1)
          .max(20)
          .optional()
          .describe('거리 허용 오차 비율 (%, 기본 10%). 예: 10이면 ±10% 이내 활동만 포함'),
      }),
      execute: async ({ distanceKm, tolerancePct = 10 }) => {
        const targetM = distanceKm * 1000
        const toleranceM = targetM * (tolerancePct / 100)

        const activities = await prisma.activity.findMany({
          where: {
            userId,
            distance: {
              gte: targetM - toleranceM,
              lte: targetM + toleranceM,
            },
          },
          orderBy: { averageSpeed: 'desc' },
          take: 5,
          select: {
            name: true,
            distance: true,
            movingTime: true,
            startDate: true,
            averageSpeed: true,
            averageHeartrate: true,
          },
        })

        if (activities.length === 0) {
          return {
            result: `${distanceKm}km 거리(±${tolerancePct}%) 기록이 없습니다.`,
          }
        }

        const records = activities.map((a, i) => ({
          rank: i + 1,
          date: formatDate(a.startDate),
          name: a.name,
          distance: formatDistanceKm(a.distance),
          duration: formatDuration(a.movingTime),
          pace: formatPace(a.averageSpeed),
          avgHr: a.averageHeartrate ? `${Math.round(a.averageHeartrate)}bpm` : null,
        }))

        return {
          targetDistance: `${distanceKm}km`,
          tolerance: `±${tolerancePct}%`,
          best: records[0],
          allRecords: records,
        }
      },
    }),

    getActivityDetail: tool({
      description:
        '특정 활동의 상세 정보와 랩(구간) 데이터를 조회합니다. 먼저 getRecentActivities로 id를 확인하세요.',
      inputSchema: z.object({
        activityId: z.string().describe('조회할 활동의 UUID'),
      }),
      execute: async ({ activityId }) => {
        const activity = await prisma.activity.findFirst({
          where: { id: activityId, userId },
          include: {
            laps: {
              orderBy: { lapIndex: 'asc' },
              select: {
                lapIndex: true,
                distance: true,
                movingTime: true,
                averageSpeed: true,
                averageHeartrate: true,
                paceZone: true,
              },
            },
          },
        })

        if (!activity) {
          return { error: '해당 활동을 찾을 수 없습니다.' }
        }

        return {
          name: activity.name,
          date: formatDate(activity.startDate),
          distance: formatDistanceKm(activity.distance),
          duration: formatDuration(activity.movingTime),
          pace: formatPace(activity.averageSpeed),
          avgHr: activity.averageHeartrate
            ? `${Math.round(activity.averageHeartrate)}bpm`
            : null,
          maxHr: activity.maxHeartrate ? `${Math.round(activity.maxHeartrate)}bpm` : null,
          elevation:
            activity.totalElevationGain > 0 ? `+${activity.totalElevationGain}m` : null,
          cadence: activity.averageCadence ? `${Math.round(activity.averageCadence)}spm` : null,
          calories: activity.calories ? `${Math.round(activity.calories)}kcal` : null,
          description: activity.description || null,
          laps:
            activity.laps.length > 0
              ? activity.laps.map((lap) => ({
                  lap: lap.lapIndex + 1,
                  distance: formatDistanceKm(lap.distance),
                  duration: formatDuration(lap.movingTime),
                  pace: formatPace(lap.averageSpeed),
                  avgHr: lap.averageHeartrate
                    ? `${Math.round(lap.averageHeartrate)}bpm`
                    : null,
                  paceZone: lap.paceZone,
                }))
              : null,
        }
      },
    }),

    getTrainingLoad: tool({
      description:
        'ACWR(급성:만성 훈련 부하 비율)을 계산합니다. "훈련 부하가 적정한지", "과훈련 위험이 있는지" 판단할 때 사용하세요. 단순 통계 확인은 getActivityStats를 사용하세요.',
      inputSchema: z.object({}),
      execute: async () => {
        const now = new Date()

        const since28 = new Date(now)
        since28.setDate(now.getDate() - 28)
        const since7 = new Date(now)
        since7.setDate(now.getDate() - 7)

        const [all28, recent7] = await Promise.all([
          prisma.activity.findMany({
            where: { userId, startDate: { gte: since28 } },
            select: { distance: true, startDate: true },
            orderBy: { startDate: 'asc' },
          }),
          prisma.activity.aggregate({
            where: { userId, startDate: { gte: since7 } },
            _sum: { distance: true },
          }),
        ])

        const acuteKm = (recent7._sum.distance ?? 0) / 1000

        if (all28.length === 0 || acuteKm === 0) {
          return { result: '데이터 부족: 최근 7일간 활동이 없습니다.' }
        }

        // chronic: 보유 기간만큼 축소 (최소 7일, 최대 28일)
        const oldestDate = all28[0].startDate
        const daysAvailable = Math.round((now.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24))
        if (daysAvailable < 7) {
          return { result: '데이터 부족: 7일 미만의 기록으로는 계산할 수 없습니다.' }
        }

        const chronicWeeks = Math.min(daysAvailable, 28) / 7
        const totalKm = all28.reduce((s, a) => s + a.distance, 0) / 1000
        const chronicKmPerWeek = totalKm / chronicWeeks

        let acwr: number | null = null
        let interpretation = ''
        if (chronicKmPerWeek > 0) {
          acwr = Math.round((acuteKm / chronicKmPerWeek) * 100) / 100
          if (acwr < 0.8) interpretation = '언더트레이닝 (훈련량 부족)'
          else if (acwr <= 1.3) interpretation = '적정 범위'
          else if (acwr <= 1.5) interpretation = '주의 (과부하 위험 증가)'
          else interpretation = '과부하 (부상 주의)'
        }

        return {
          note: '참고 지표이며 의학적 진단이 아닙니다.',
          acute7dKm: `${acuteKm.toFixed(2)}km`,
          chronicWeeklyKm: `${chronicKmPerWeek.toFixed(2)}km`,
          chronicBasisDays: Math.min(daysAvailable, 28),
          acwr,
          interpretation,
        }
      },
    }),

    getHRZoneAnalysis: tool({
      description:
        '최근 N일 활동의 심박수 구역 분포를 분석합니다. "80/20 훈련 규칙을 지키고 있는지", "심박수 존별 분포"를 확인할 때 사용하세요.',
      inputSchema: z.object({
        days: z
          .number()
          .int()
          .min(7)
          .max(90)
          .optional()
          .describe('분석 기간 (일, 기본 28일)'),
      }),
      execute: async ({ days = 28 }) => {
        const since = new Date()
        since.setDate(since.getDate() - days)

        // 유저 프로필 조회 (최대 심박수)
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { measuredMaxHR: true, birthYear: true },
        })

        const activities = await prisma.activity.findMany({
          where: { userId, startDate: { gte: since }, averageHeartrate: { not: null } },
          select: { averageHeartrate: true, maxHeartrate: true, distance: true, startDate: true },
          orderBy: { startDate: 'desc' },
        })

        if (activities.length < 3) {
          return {
            result: '데이터 부족: 심박 데이터가 있는 활동이 3개 미만입니다.',
          }
        }

        // 최대 심박수 결정
        let maxHR: number
        let maxHRSource: string
        if (dbUser?.measuredMaxHR) {
          maxHR = dbUser.measuredMaxHR
          maxHRSource = '직접 측정값'
        } else if (dbUser?.birthYear) {
          const age = new Date().getFullYear() - dbUser.birthYear
          maxHR = 220 - age
          maxHRSource = `220-나이 추정 (${age}세)`
        } else {
          maxHR = 180
          maxHRSource = '기본값 (측정 권장)'
        }

        // Zone 경계 (% of max HR)
        const zones = [
          { name: 'Zone 1 (회복)', min: 0, max: 0.6 },
          { name: 'Zone 2 (유산소)', min: 0.6, max: 0.7 },
          { name: 'Zone 3 (템포)', min: 0.7, max: 0.8 },
          { name: 'Zone 4 (역치)', min: 0.8, max: 0.9 },
          { name: 'Zone 5 (최대)', min: 0.9, max: 1.0 },
        ]

        const zoneCounts = zones.map(() => 0)
        for (const a of activities) {
          if (!a.averageHeartrate) continue
          const ratio = a.averageHeartrate / maxHR
          for (let i = zones.length - 1; i >= 0; i--) {
            if (ratio >= zones[i].min) {
              zoneCounts[i]++
              break
            }
          }
        }

        const total = activities.length
        const zoneDistribution = zones.map((z, i) => ({
          zone: z.name,
          count: zoneCounts[i],
          percent: `${Math.round((zoneCounts[i] / total) * 100)}%`,
        }))

        // 80/20 판단: Zone 1+2가 80% 이상이면 준수
        const aerobicCount = zoneCounts[0] + zoneCounts[1]
        const aerobicPct = Math.round((aerobicCount / total) * 100)
        const rule8020 = aerobicPct >= 80 ? '준수 (유산소 80% 이상)' : `미달 (유산소 ${aerobicPct}%, 80% 목표)`

        return {
          period: `최근 ${days}일`,
          activitiesWithHR: total,
          maxHR,
          maxHRSource,
          zoneDistribution,
          rule8020,
        }
      },
    }),

    searchActivities: tool({
      description: '활동명 키워드 또는 날짜 범위로 러닝 기록을 검색합니다.',
      inputSchema: z.object({
        keyword: z.string().optional().describe('활동명에 포함된 키워드 (예: "한강", "마라톤")'),
        startDate: z
          .string()
          .optional()
          .describe('검색 시작 날짜 (ISO 형식, 예: "2025-01-01")'),
        endDate: z
          .string()
          .optional()
          .describe('검색 종료 날짜 (ISO 형식, 예: "2025-03-31")'),
        limit: z.number().int().min(1).max(20).optional().describe('최대 결과 수 (기본 10)'),
      }),
      execute: async ({ keyword, startDate, endDate, limit = 10 }) => {
        const where: {
          userId: string
          name?: { contains: string; mode: 'insensitive' }
          startDate?: { gte?: Date; lte?: Date }
        } = { userId }

        if (keyword) {
          where.name = { contains: keyword, mode: 'insensitive' }
        }

        if (startDate || endDate) {
          where.startDate = {}
          if (startDate) where.startDate.gte = new Date(startDate)
          if (endDate) where.startDate.lte = new Date(endDate)
        }

        const activities = await prisma.activity.findMany({
          where,
          orderBy: { startDate: 'desc' },
          take: limit,
          select: {
            id: true,
            name: true,
            distance: true,
            movingTime: true,
            startDate: true,
            averageSpeed: true,
            averageHeartrate: true,
          },
        })

        if (activities.length === 0) {
          return { result: '검색 조건에 맞는 활동이 없습니다.', activities: [] }
        }

        return {
          count: activities.length,
          activities: activities.map((a) => ({
            id: a.id,
            date: formatDate(a.startDate),
            name: a.name,
            distance: formatDistanceKm(a.distance),
            duration: formatDuration(a.movingTime),
            pace: formatPace(a.averageSpeed),
            avgHr: a.averageHeartrate ? `${Math.round(a.averageHeartrate)}bpm` : null,
          })),
        }
      },
    }),
  }
}
