import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import ChatInterface from '@/components/coach/chat-interface'

export default async function CoachPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) redirect('/')

  const llmKey = await prisma.userLLMKey.findFirst({
    where: { userId: dbUser.id, provider: 'gemini', isActive: true },
    select: { model: true },
  })

  const modelLabels: Record<string, string> = {
    'gemini-3.1-flash': 'Gemini 3.1 Flash',
    'gemini-3.1-flash-lite': 'Gemini 3.1 Flash Lite',
    'gemini-3.1-pro': 'Gemini 3.1 Pro',
  }

  const modelLabel = llmKey ? (modelLabels[llmKey.model] ?? llmKey.model) : ''

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">AI 코치</h1>
      <ChatInterface hasApiKey={!!llmKey} modelLabel={modelLabel} />
    </div>
  )
}
