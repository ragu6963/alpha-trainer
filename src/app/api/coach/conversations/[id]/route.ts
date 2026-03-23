import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: dbUser.id },
    })

    if (!conversation) {
      return Response.json({ error: 'CONVERSATION_NOT_FOUND' }, { status: 404 })
    }

    await prisma.conversation.delete({ where: { id } })

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error deleting conversation:', error)
    return Response.json({ error: 'DELETE_ERROR' }, { status: 500 })
  }
}
