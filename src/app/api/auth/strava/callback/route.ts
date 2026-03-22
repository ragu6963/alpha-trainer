import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${APP_URL}/settings?error=strava_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/settings?error=invalid_callback`)
  }

  // CSRF state 검증
  const cookieStore = await cookies()
  const savedState = cookieStore.get('strava_oauth_state')?.value
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${APP_URL}/settings?error=invalid_state`)
  }
  cookieStore.delete('strava_oauth_state')

  // 로그인 세션 확인
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${APP_URL}/?error=not_logged_in`)
  }

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) {
    return NextResponse.redirect(`${APP_URL}/?error=not_logged_in`)
  }

  // Strava 토큰 교환
  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${APP_URL}/settings?error=token_exchange_failed`)
  }

  const { access_token, refresh_token, expires_at, athlete } = await tokenRes.json()
  const stravaAthleteId: number = athlete.id

  // 허용된 Strava athlete ID 검사
  const allowedIds = process.env.ALLOWED_STRAVA_ATHLETE_IDS
  if (allowedIds) {
    const allowed = allowedIds.split(',').map((id) => id.trim())
    if (!allowed.includes(String(stravaAthleteId))) {
      return NextResponse.redirect(`${APP_URL}/settings?error=strava_not_authorized`)
    }
  }

  // 다른 유저에 이미 연결된 Strava 계정인지 확인
  const existingLink = await prisma.user.findUnique({ where: { stravaAthleteId } })
  if (existingLink && existingLink.id !== dbUser.id) {
    return NextResponse.redirect(`${APP_URL}/settings?error=strava_already_linked`)
  }

  // 현재 유저에 Strava 연결
  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      stravaAthleteId,
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiresAt: new Date(expires_at * 1000),
    },
  })

  return NextResponse.redirect(`${APP_URL}/dashboard`)
}
