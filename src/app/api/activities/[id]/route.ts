import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) return Response.json({ error: 'USER_NOT_FOUND' }, { status: 404 })

  const { id } = await params
  const activity = await prisma.activity.findUnique({ where: { id } })

  if (!activity || activity.userId !== dbUser.id) {
    return Response.json({ error: 'NOT_FOUND' }, { status: 404 })
  }

  return Response.json({
    ...activity,
    stravaActivityId: activity.stravaActivityId.toString(),
  })
}
