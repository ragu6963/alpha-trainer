import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { Errors } from '@/lib/api-error'

export async function PUT(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()

  const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
  if (!dbUser) return Errors.userNotFound()

  let body: { birthYear?: number | null; measuredMaxHR?: number | null }
  try {
    body = await req.json()
  } catch {
    return Errors.badRequest('Invalid JSON')
  }

  if (body.birthYear !== undefined && body.birthYear !== null) {
    const year = Number(body.birthYear)
    if (!Number.isInteger(year) || year < 1920 || year > new Date().getFullYear() - 10) {
      return Errors.badRequest('유효하지 않은 출생연도입니다.')
    }
  }

  if (body.measuredMaxHR !== undefined && body.measuredMaxHR !== null) {
    const hr = Number(body.measuredMaxHR)
    if (!Number.isInteger(hr) || hr < 100 || hr > 250) {
      return Errors.badRequest('유효하지 않은 최대 심박수입니다.')
    }
  }

  const updated = await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      birthYear: body.birthYear ?? null,
      measuredMaxHR: body.measuredMaxHR ?? null,
    },
    select: { birthYear: true, measuredMaxHR: true },
  })

  return Response.json({ profile: updated })
}
