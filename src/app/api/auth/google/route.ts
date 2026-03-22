import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${APP_URL}/api/auth/google/callback`,
    },
  })

  if (error || !data.url) {
    return NextResponse.redirect(`${APP_URL}/?error=google_failed`)
  }

  return NextResponse.redirect(data.url)
}
