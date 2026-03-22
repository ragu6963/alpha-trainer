import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

// POST: Strava 연결 해제 (deauthorize + 로그아웃, 데이터는 유지)
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) return Response.json({ error: 'USER_NOT_FOUND' }, { status: 404 })

  // Strava OAuth 연동 해제
  try {
    await fetch('https://www.strava.com/oauth/deauthorize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${dbUser.accessToken}` },
    })
  } catch {
    // deauthorize 실패해도 로그아웃은 진행
  }

  // Supabase 세션 무효화
  await supabase.auth.signOut()

  const response = NextResponse.redirect(`${APP_URL}/`)
  response.cookies.delete('sb-access-token')
  response.cookies.delete('sb-refresh-token')
  return response
}
