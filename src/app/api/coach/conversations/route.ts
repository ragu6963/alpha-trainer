import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
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
    const conversations = await prisma.conversation.findMany({
      where: { userId: dbUser.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
    })

    return Response.json(conversations)
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return Response.json({ error: 'FETCH_ERROR' }, { status: 500 })
  }
}
