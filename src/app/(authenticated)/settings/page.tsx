import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import LLMKeyForm from '@/components/settings/llm-key-form'
import StravaConnection from '@/components/settings/strava-connection'
import DeleteAccountDialog from '@/components/settings/delete-account-dialog'
import GoalForm from '@/components/settings/goal-form'
import RunnerProfileForm from '@/components/settings/runner-profile-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const dbUser = await prisma.user.findUnique({
    where: { supabaseId: user.id },
    include: { goal: true },
  })
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


      {/* 훈련 목표 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">훈련 목표</h2>
        <p className="text-sm text-muted-foreground">
          AI 코치가 목표를 기반으로 맞춤 코칭을 제공합니다.
        </p>
        <GoalForm
          savedGoal={
            dbUser.goal
              ? {
                  goalType: dbUser.goal.goalType,
                  targetRaceDate: dbUser.goal.targetRaceDate?.toISOString() ?? null,
                  targetRaceName: dbUser.goal.targetRaceName,
                  targetDistanceKm: dbUser.goal.targetDistanceKm,
                  targetFinishTime: dbUser.goal.targetFinishTime,
                  weeklyDistanceGoalKm: dbUser.goal.weeklyDistanceGoalKm,
                  weeklyRunCountGoal: dbUser.goal.weeklyRunCountGoal,
                  memo: dbUser.goal.memo,
                }
              : null
          }
        />
      </section>

      {/* 러너 프로필 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">러너 프로필</h2>
        <p className="text-sm text-muted-foreground">
          심박수 기반 코칭의 정확도를 높이기 위한 신체 정보입니다.
        </p>
        <RunnerProfileForm
          profile={{
            birthYear: dbUser.birthYear,
            measuredMaxHR: dbUser.measuredMaxHR,
          }}
        />
      </section>

      {/* Strava 연동 */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Strava 연동</h2>
        {dbUser.stravaAthleteId && dbUser.tokenExpiresAt ? (
          <StravaConnection
            athleteId={dbUser.stravaAthleteId}
            tokenExpiresAt={dbUser.tokenExpiresAt.toISOString()}
          />
        ) : (
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm text-muted-foreground">Strava 계정이 연결되어 있지 않습니다.</p>
            <a
              href="/api/auth/strava"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--color-strava)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              Strava 연결하기
            </a>
          </div>
        )}
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
