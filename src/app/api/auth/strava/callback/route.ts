import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { createServiceClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // 에러 처리 (사용자가 Strava 인증 거부)
  if (error) {
    return NextResponse.redirect(`${APP_URL}/?error=strava_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/?error=invalid_callback`)
  }

  // CSRF state 검증
  const cookieStore = await cookies()
  const savedState = cookieStore.get('strava_oauth_state')?.value
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${APP_URL}/?error=invalid_state`)
  }
  cookieStore.delete('strava_oauth_state')

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
    return NextResponse.redirect(`${APP_URL}/?error=token_exchange_failed`)
  }

  const tokenData = await tokenRes.json()
  const { access_token, refresh_token, expires_at, athlete } = tokenData

  const stravaAthleteId: number = athlete.id

  // Supabase Auth 사용자 처리
  const supabase = await createServiceClient()

  // athlete_id 기반 이메일 생성 (Supabase Auth 연동용)
  const email = `strava_${stravaAthleteId}@alpha-trainer.local`
  const password = `strava_${stravaAthleteId}_${process.env.STRAVA_CLIENT_SECRET}`

  let supabaseUserId: string

  // 기존 사용자 확인
  const existingUser = await prisma.user.findUnique({
    where: { stravaAthleteId },
  })

  if (existingUser) {
    // 기존 사용자 — 로그인
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError || !data.session) {
      return NextResponse.redirect(`${APP_URL}/?error=auth_failed`)
    }
    supabaseUserId = data.user.id

    // Strava 토큰 업데이트
    await prisma.user.update({
      where: { stravaAthleteId },
      data: {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: new Date(expires_at * 1000),
      },
    })

    // 세션 쿠키 설정
    const response = NextResponse.redirect(`${APP_URL}/dashboard`)
    setSessionCookies(response, data.session)
    return response
  } else {
    // 신규 사용자 — 회원가입 (이메일 인증 없이 즉시 생성)
    const { data, error: signUpError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (signUpError || !data.user) {
      console.error('[strava/callback] createUser failed:', signUpError, 'user:', data?.user)
      return NextResponse.redirect(`${APP_URL}/?error=signup_failed`)
    }
    supabaseUserId = data.user.id

    // User 테이블에 레코드 생성
    await prisma.user.create({
      data: {
        supabaseId: supabaseUserId,
        stravaAthleteId,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: new Date(expires_at * 1000),
      },
    })

    // 신규 가입 후 로그인
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (signInError || !sessionData.session) {
      return NextResponse.redirect(`${APP_URL}/?error=auth_failed`)
    }

    const response = NextResponse.redirect(`${APP_URL}/dashboard`)
    setSessionCookies(response, sessionData.session)
    return response
  }
}

function setSessionCookies(response: NextResponse, session: { access_token: string; refresh_token: string; expires_in: number }) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }

  response.cookies.set('sb-access-token', session.access_token, {
    ...cookieOptions,
    maxAge: session.expires_in,
  })
  response.cookies.set('sb-refresh-token', session.refresh_token, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30, // 30일
  })
}
