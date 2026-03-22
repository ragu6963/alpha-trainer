import { prisma } from '@/lib/prisma'
import ChartSectionClient from './chart-section-client'

export default async function ChartSectionWrapper({ userId }: { userId: string }) {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const activities = await prisma.activity.findMany({
    where: {
      userId,
      startDate: { gte: sixMonthsAgo },
    },
    orderBy: { startDate: 'asc' },
    select: {
      id: true,
      startDate: true,
      distance: true,
      averageSpeed: true,
      averageHeartrate: true,
      maxHeartrate: true,
      totalElevationGain: true,
      calories: true,
      averageCadence: true,
      movingTime: true,
      elapsedTime: true,
      maxSpeed: true,
    },
  })

  // 클라이언트 컴포넌트로 전달하기 위해 Date를 ISO 문자열로 직렬화
  const chartData = activities.map((a) => ({
    id: a.id,
    startDate: a.startDate.toISOString(),
    distance: a.distance,
    averageSpeed: a.averageSpeed,
    averageHeartrate: a.averageHeartrate,
    maxHeartrate: a.maxHeartrate,
    totalElevationGain: a.totalElevationGain,
    calories: a.calories,
    averageCadence: a.averageCadence,
    movingTime: a.movingTime,
    elapsedTime: a.elapsedTime,
    maxSpeed: a.maxSpeed,
  }))

  return <ChartSectionClient activities={chartData} />
}
