import { type NextRequest } from 'next/server'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, Output } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCoachingData } from '@/lib/coaching-data'
import { buildSystemPrompt } from '@/lib/system-prompt'
import { coachResponseSchema } from '@/lib/coach-response.schema'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) return Response.json({ error: 'USER_NOT_FOUND' }, { status: 404 })

  // 활성 LLM 키 조회
  const llmKey = await prisma.userLLMKey.findFirst({
    where: { userId: dbUser.id, provider: 'gemini', isActive: true },
  })
  if (!llmKey) {
    return Response.json({ error: 'NO_API_KEY', message: 'Gemini API 키가 등록되어 있지 않습니다.' }, { status: 400 })
  }

  // Vault에서 API 키 복호화
  let apiKey: string
  try {
    const result = await prisma.$queryRaw<[{ decrypted_secret: string }]>`
      SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${llmKey.vaultSecretId}::uuid
    `
    apiKey = result[0]?.decrypted_secret
    if (!apiKey) throw new Error('empty secret')
  } catch {
    return Response.json({ error: 'KEY_DECRYPT_ERROR' }, { status: 500 })
  }

  // 요청 메시지 파싱
  const body = await request.json()
  const { messages } = body

  if (!messages || messages.length === 0) {
    return Response.json({ error: 'MISSING_MESSAGES' }, { status: 400 })
  }

  // 코칭 데이터 및 시스템 프롬프트 생성
  const runningData = await getCoachingData(dbUser.id)
  const systemPrompt = buildSystemPrompt(runningData)

  const google = createGoogleGenerativeAI({ apiKey })

  try {
    const result = await generateText({
      model: google(llmKey.model),
      output: Output.object({ schema: coachResponseSchema }),
      system: systemPrompt,
      messages,
    })

    return Response.json(result.output)
  } catch (error) {
    console.error('generateText error:', error)
    return Response.json({ error: 'GENERATION_ERROR' }, { status: 500 })
  }
}
