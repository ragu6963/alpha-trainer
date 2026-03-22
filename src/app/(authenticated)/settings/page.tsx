import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import LLMKeyForm from '@/components/settings/llm-key-form'
import StravaConnection from '@/components/settings/strava-connection'
import DeleteAccountDialog from '@/components/settings/delete-account-dialog'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) redirect('/')

  // 등록된 LLM 키 목록 조회 (마스킹)
  const keys = await prisma.userLLMKey.findMany({
    where: { userId: dbUser.id, isActive: true },
    select: { provider: true, model: true, vaultSecretId: true, updatedAt: true },
  })

  const maskedKeys = await Promise.all(
    keys.map(async (k) => {
      const result = await prisma.$queryRaw<[{ decrypted_secret: string }]>`
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${k.vaultSecretId}::uuid
      `
      const raw = result[0]?.decrypted_secret ?? ''
      const masked = raw.length > 8 ? `${raw.slice(0, 4)}...${raw.slice(-4)}` : '****'
      return {
        provider: k.provider,
        model: k.model,
        maskedKey: masked,
        updatedAt: k.updatedAt.toISOString(),
      }
    })
  )

  return (
    <div className="space-y-10 max-w-2xl">
      <h1 className="text-2xl font-bold">설정</h1>

      {/* Strava 연동 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Strava 연동</h2>
        <StravaConnection
          athleteId={dbUser.stravaAthleteId}
          tokenExpiresAt={dbUser.tokenExpiresAt.toISOString()}
        />
      </section>

      {/* AI 설정 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">AI 설정</h2>
        <p className="text-sm text-muted-foreground">
          AI 코치를 사용하려면 Google Gemini API 키를 등록하세요.{' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            API 키 발급 →
          </a>
        </p>
        <LLMKeyForm savedKeys={maskedKeys} />
      </section>

      {/* 위험 영역 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-destructive">위험 영역</h2>
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 space-y-3">
          <div>
            <p className="text-sm font-medium">계정 삭제</p>
            <p className="text-sm text-muted-foreground">
              계정과 모든 데이터(러닝 기록, AI 대화, API 키)를 영구 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </p>
          </div>
          <DeleteAccountDialog />
        </div>
      </section>
    </div>
  )
}
