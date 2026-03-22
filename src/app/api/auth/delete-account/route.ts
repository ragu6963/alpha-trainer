import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Errors } from '@/lib/api-error'

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) return Errors.userNotFound()

  try {
    // 1. Vault에 저장된 LLM 시크릿 삭제
    const llmKeys = await prisma.userLLMKey.findMany({
      where: { userId: dbUser.id },
      select: { vaultSecretId: true },
    })
    for (const key of llmKeys) {
      await prisma.$executeRaw`
        DELETE FROM vault.secrets WHERE id = ${key.vaultSecretId}::uuid
      `
    }

    // 2. Strava OAuth 연동 해제 (연결된 경우에만)
    if (dbUser.accessToken) {
      try {
        await fetch('https://www.strava.com/oauth/deauthorize', {
          method: 'POST',
          headers: { Authorization: `Bearer ${dbUser.accessToken}` },
        })
      } catch {
        // Strava 연동 해제 실패는 무시하고 계속 진행
      }
    }

    // 3. DB 사용자 삭제 (Cascade로 Activity, Conversation, Message, UserLLMKey 함께 삭제)
    await prisma.user.delete({ where: { id: dbUser.id } })

    // 4. Supabase Auth 사용자 삭제 (service role 필요)
    const serviceSupabase = await createServiceClient()
    await serviceSupabase.auth.admin.deleteUser(user.id)

    // 5. 세션 무효화 후 랜딩 페이지로 리다이렉트
    const response = NextResponse.json({ success: true })
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')
    return response
  } catch (err) {
    console.error('[delete-account] error:', err)
    return Errors.internal()
  }
}
