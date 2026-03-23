import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(
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
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!conversation) {
      return Response.json({ error: 'CONVERSATION_NOT_FOUND' }, { status: 404 })
    }

    const formattedMessages = conversation.messages.map((m) => {
      if (m.role === 'user') {
        return {
          id: m.id,
          role: 'user',
          text: m.content,
        }
      } else {
        // assistant message content was saved as JSON
        let responseObj = null
        try {
          responseObj = JSON.parse(m.content)
        } catch (e) {
          responseObj = { text: m.content } // fallback
        }
        const { toolCalls, ...response } = responseObj ?? {}
        return {
          id: m.id,
          role: 'assistant',
          response,
          ...(toolCalls ? { toolCalls } : {}),
        }
      }
    })

    return Response.json({
      id: conversation.id,
      title: conversation.title,
      messages: formattedMessages,
    })
  } catch (error) {
    console.error('Error fetching conversation messages:', error)
    return Response.json({ error: 'FETCH_ERROR' }, { status: 500 })
  }
}
