import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText } from 'ai'

// POST: API 키 유효성 검증 (테스트 호출)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const { apiKey, model } = await request.json() as { apiKey: string; model: string }
  if (!apiKey || !model) {
    return Response.json({ error: 'MISSING_FIELDS' }, { status: 400 })
  }

  try {
    const google = createGoogleGenerativeAI({ apiKey })
    await generateText({
      model: google(model),
      prompt: 'Hi',
      maxOutputTokens: 5,
    })
    return Response.json({ valid: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ valid: false, message }, { status: 400 })
  }
}
