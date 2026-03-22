import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// POST: API 키 저장/업데이트
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) return Response.json({ error: 'USER_NOT_FOUND' }, { status: 404 })

  const body = await request.json()
  const { provider, model, apiKey } = body as {
    provider: string
    model: string
    apiKey: string
  }

  if (!provider || !model || !apiKey) {
    return Response.json({ error: 'MISSING_FIELDS' }, { status: 400 })
  }

  // 기존 키 조회
  const existing = await prisma.userLLMKey.findUnique({
    where: { userId_provider: { userId: dbUser.id, provider: provider as 'gemini' | 'openai' | 'anthropic' } },
  })

  try {
    let vaultSecretId: string

    if (existing) {
      // Vault 시크릿 업데이트
      await prisma.$executeRaw`
        SELECT vault.update_secret(${existing.vaultSecretId}::uuid, ${apiKey})
      `
      vaultSecretId = existing.vaultSecretId

      await prisma.userLLMKey.update({
        where: { id: existing.id },
        data: { model, isActive: true },
      })
    } else {
      // 새 Vault 시크릿 생성
      const result = await prisma.$queryRaw<[{ create_secret: string }]>`
        SELECT vault.create_secret(${apiKey}, ${`llm-key-${dbUser.id}-${provider}`})::text AS create_secret
      `
      vaultSecretId = result[0].create_secret

      await prisma.userLLMKey.create({
        data: {
          userId: dbUser.id,
          provider: provider as 'gemini' | 'openai' | 'anthropic',
          model,
          vaultSecretId,
          isActive: true,
        },
      })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('LLM key save error:', err)
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

// GET: 현재 등록된 키 정보 조회 (마스킹)
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) return Response.json({ error: 'USER_NOT_FOUND' }, { status: 404 })

  const keys = await prisma.userLLMKey.findMany({
    where: { userId: dbUser.id, isActive: true },
    select: { provider: true, model: true, vaultSecretId: true, updatedAt: true },
  })

  // 각 키의 앞 4자리 + 마지막 4자리만 반환
  const maskedKeys = await Promise.all(
    keys.map(async (k) => {
      const result = await prisma.$queryRaw<[{ decrypted_secret: string }]>`
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${k.vaultSecretId}::uuid
      `
      const raw = result[0]?.decrypted_secret ?? ''
      const masked =
        raw.length > 8
          ? `${raw.slice(0, 4)}...${raw.slice(-4)}`
          : '****'
      return { provider: k.provider, model: k.model, maskedKey: masked, updatedAt: k.updatedAt }
    })
  )

  return Response.json({ keys: maskedKeys })
}

// DELETE: API 키 삭제
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) return Response.json({ error: 'USER_NOT_FOUND' }, { status: 404 })

  const { provider } = await request.json() as { provider: string }

  const existing = await prisma.userLLMKey.findUnique({
    where: { userId_provider: { userId: dbUser.id, provider: provider as 'gemini' | 'openai' | 'anthropic' } },
  })
  if (!existing) return Response.json({ error: 'NOT_FOUND' }, { status: 404 })

  try {
    // Vault 시크릿 삭제
    await prisma.$executeRaw`
      DELETE FROM vault.secrets WHERE id = ${existing.vaultSecretId}::uuid
    `
    await prisma.userLLMKey.delete({ where: { id: existing.id } })

    return Response.json({ success: true })
  } catch (err) {
    console.error('LLM key delete error:', err)
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
