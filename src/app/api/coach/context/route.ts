import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCoachingData } from '@/lib/coaching-data'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) {
    return Response.json({ error: 'USER_NOT_FOUND' }, { status: 404 })
  }

  try {
    const context = await getCoachingData(dbUser.id)
    return Response.json({ context })
  } catch (error) {
    console.error('Error fetching coaching context:', error)
    return Response.json({ error: 'FETCH_ERROR' }, { status: 500 })
  }
}
