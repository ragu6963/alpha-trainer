import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) return Response.json({ error: 'USER_NOT_FOUND' }, { status: 404 })

  // 이번 주 월요일 00:00:00
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=일, 1=월, ..., 6=토
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - daysFromMonday)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  const where = { userId: dbUser.id, startDate: { gte: weekStart, lt: weekEnd } }

  const [count, sums] = await Promise.all([
    prisma.activity.count({ where }),
    prisma.activity.aggregate({
      where,
      _sum: { distance: true, movingTime: true },
    }),
  ])

  return Response.json({
    count,
    distanceM: sums._sum.distance ?? 0,
    movingTimeSec: sums._sum.movingTime ?? 0,
  })
}
