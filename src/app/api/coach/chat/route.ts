import { type NextRequest } from 'next/server'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { generateText, Output, stepCountIs } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getCoachingData } from '@/lib/coaching-data'
import { buildSystemPrompt } from '@/lib/system-prompt'
import { coachResponseSchema } from '@/lib/coach-response.schema'
import { buildCoachingTools } from '@/lib/coaching-tools'

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
  const { messages, conversationId } = body

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
      tools: buildCoachingTools(dbUser.id),
      stopWhen: stepCountIs(3),
    })

    let currentConversationId = conversationId
    if (!currentConversationId) {
      // 대화 생성
      const firstUserMsg = messages[0].content
      // 제목 자동 생성 (첫 사용자 메시지 기반 요약, 임시로 30자 자름)
      const title = firstUserMsg.length > 30 ? firstUserMsg.slice(0, 30) + '...' : firstUserMsg

      const conv = await prisma.conversation.create({
        data: {
          userId: dbUser.id,
          title,
        },
      })
      currentConversationId = conv.id
    }

    // 마지막 사용자 메시지
    const lastUserMsg = messages[messages.length - 1]

    // 메시지 DB 저장 (병렬 처리)
    await Promise.all([
      prisma.message.create({
        data: {
          conversationId: currentConversationId,
          role: 'user',
          content: lastUserMsg.content,
        },
      }),
      prisma.message.create({
        data: {
          conversationId: currentConversationId,
          role: 'assistant',
          content: JSON.stringify(result.output),
        },
      }),
    ])

    // tool 사용 정보 추출
    const toolCalls = result.steps.flatMap((step) =>
      step.toolCalls.map((tc) => ({
        toolName: tc.toolName,
        args: tc.input as Record<string, unknown>,
      }))
    )

    return Response.json({
      ...result.output,
      conversationId: currentConversationId,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    })
  } catch (error) {
    console.error('generateText error:', error)
    return Response.json({ error: 'GENERATION_ERROR' }, { status: 500 })
  }
}
