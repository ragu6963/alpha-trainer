import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) return Response.json({ error: 'USER_NOT_FOUND' }, { status: 404 })

  const pageParam = request.nextUrl.searchParams.get('page')
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const perPage = 10

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where: { userId: dbUser.id },
      orderBy: { startDate: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
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

  return Response.json({
    activities: activities.map((a) => ({
      ...a,
      startDate: a.startDate.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / perPage),
  })
}
