import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/?error=google_denied`)
  }

  const supabase = await createClient()

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError || !data.session) {
    return NextResponse.redirect(`${APP_URL}/?error=google_failed`)
  }

  // Prisma User row upsert (Strava 필드는 나중에 연결)
  await prisma.user.upsert({
    where: { supabaseId: data.user.id },
    create: { supabaseId: data.user.id },
    update: {},
  })

  return NextResponse.redirect(`${APP_URL}/dashboard`)
}
