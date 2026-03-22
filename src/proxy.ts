import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_PATHS = ['/dashboard', '/coach', '/activities', '/settings']
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { supabaseResponse, user } = await updateSession(request)

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))

  // 미인증 → 보호 경로 접근 시 랜딩으로 리다이렉트
  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 인증 완료 → 랜딩 접근 시 대시보드로 리다이렉트
  if (pathname === '/' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth/strava|fonts|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
