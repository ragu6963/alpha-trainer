import { prisma } from '@/lib/prisma'
import { UserModel } from '@/generated/prisma/models/User'

const TOKEN_REFRESH_BUFFER_SECONDS = 300 // 만료 5분 전 갱신

export async function getValidStravaToken(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

  if (!user.accessToken || !user.refreshToken || !user.tokenExpiresAt) {
    throw new Error('STRAVA_NOT_CONNECTED')
  }

  return refreshIfNeeded(user as UserModel & {
    accessToken: string
    refreshToken: string
    tokenExpiresAt: Date
  })
}

async function refreshIfNeeded(
  user: UserModel & { accessToken: string; refreshToken: string; tokenExpiresAt: Date }
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = Math.floor(user.tokenExpiresAt.getTime() / 1000)

  if (expiresAt - now > TOKEN_REFRESH_BUFFER_SECONDS) {
    return user.accessToken
  }

  // 토큰 갱신
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: user.refreshToken,
    }),
  })

  if (!res.ok) {
    throw new Error('STRAVA_TOKEN_REFRESH_FAILED')
  }

  const { access_token, refresh_token, expires_at } = await res.json()

  await prisma.user.update({
    where: { id: user.id },
    data: {
      accessToken: access_token,
      refreshToken: refresh_token,
      tokenExpiresAt: new Date(expires_at * 1000),
    },
  })

  return access_token
}
