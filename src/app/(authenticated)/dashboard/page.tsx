import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import SyncPanel from '@/components/dashboard/sync-panel'
import StatsCards from '@/components/dashboard/stats-cards'
import ActivityList, { type ActivityItem } from '@/components/dashboard/activity-list'
import StravaConnectBanner from '@/components/dashboard/strava-connect-banner'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true, stravaAthleteId: true, lastSyncedAt: true },
  })
  if (!dbUser) redirect('/')

  // Strava 미연결 시 연동 안내
  if (!dbUser.stravaAthleteId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <StravaConnectBanner />
      </div>
    )
  }

  // 이번 주 월요일 00:00:00
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - daysFromMonday)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const weekWhere = { userId: dbUser.id, startDate: { gte: weekStart, lt: weekEnd } }

  const [weekCount, weekSums, activities, total] = await Promise.all([
    prisma.activity.count({ where: weekWhere }),
    prisma.activity.aggregate({
      where: weekWhere,
      _sum: { distance: true, movingTime: true },
    }),
    prisma.activity.findMany({
      where: { userId: dbUser.id },
      orderBy: { startDate: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        startDate: true,
        distance: true,
        movingTime: true,
        averageSpeed: true,
      },
    }),
    prisma.activity.count({ where: { userId: dbUser.id } }),
  ])

  const initialActivities: ActivityItem[] = activities.map((a) => ({
    ...a,
    startDate: a.startDate.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">대시보드</h1>

      <StatsCards
        count={weekCount}
        distanceM={weekSums._sum.distance ?? 0}
        movingTimeSec={weekSums._sum.movingTime ?? 0}
      />

      <ActivityList
        initialActivities={initialActivities}
        initialTotal={total}
        initialTotalPages={Math.ceil(total / 10)}
      />

      <SyncPanel lastSyncedAt={dbUser.lastSyncedAt} />
    </div>
  )
}
