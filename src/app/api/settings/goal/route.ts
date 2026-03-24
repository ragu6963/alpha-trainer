import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Errors } from '@/lib/api-error'
import { GoalType } from '@/generated/prisma/enums'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) return Errors.userNotFound()

  const goal = await prisma.userGoal.findUnique({ where: { userId: dbUser.id } })
  return Response.json({ goal })
}

export async function PUT(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) return Errors.userNotFound()

  let body: {
    goalType?: string
    targetRaceDate?: string | null
    targetRaceName?: string | null
    targetDistanceKm?: number | null
    targetFinishTime?: string | null
    weeklyDistanceGoalKm?: number | null
    weeklyRunCountGoal?: number | null
    memo?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return Errors.badRequest('Invalid JSON')
  }

  const validGoalTypes = ['race_completion', 'pace_improvement', 'distance_increase', 'frequency']
  if (!body.goalType || !validGoalTypes.includes(body.goalType)) {
    return Errors.badRequest('유효하지 않은 goalType입니다.')
  }

  const data = {
    goalType: body.goalType as GoalType,
    targetRaceDate: body.targetRaceDate ? new Date(body.targetRaceDate) : null,
    targetRaceName: body.targetRaceName ?? null,
    targetDistanceKm: body.targetDistanceKm ?? null,
    targetFinishTime: body.targetFinishTime ?? null,
    weeklyDistanceGoalKm: body.weeklyDistanceGoalKm ?? null,
    weeklyRunCountGoal: body.weeklyRunCountGoal ?? null,
    memo: body.memo ?? null,
  }

  const goal = await prisma.userGoal.upsert({
    where: { userId: dbUser.id },
    update: { ...data, updatedAt: new Date() },
    create: { userId: dbUser.id, ...data },
  })

  return Response.json({ goal })
}

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) return Errors.userNotFound()

  await prisma.userGoal.deleteMany({ where: { userId: dbUser.id } })
  return Response.json({ success: true })
}
