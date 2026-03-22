import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) return Response.json({ error: 'USER_NOT_FOUND' }, { status: 404 })

  // Strava OAuth 연동 해제 (best-effort)
  if (dbUser.accessToken) {
    try {
      await fetch('https://www.strava.com/oauth/deauthorize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${dbUser.accessToken}` },
      })
    } catch {
      // deauthorize 실패해도 계속 진행
    }
  }

  // Strava 필드만 null 처리 — 로그인 상태는 유지
  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      stravaAthleteId: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      lastSyncedAt: null,
    },
  })

  return NextResponse.redirect(`${APP_URL}/settings`)
}
