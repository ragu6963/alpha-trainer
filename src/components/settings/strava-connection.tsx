'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

type Props = {
  athleteId: number
  tokenExpiresAt: string // ISO string
}

export default function StravaConnection({ athleteId, tokenExpiresAt }: Props) {
  const [disconnecting, setDisconnecting] = useState(false)

  const isTokenValid = new Date(tokenExpiresAt) > new Date()

  async function handleDisconnect() {
    if (
      !confirm(
        'Strava 연결을 해제하시겠습니까?\n로그아웃되며, 재연결하려면 다시 Strava로 로그인해야 합니다.'
      )
    )
      return

    setDisconnecting(true)
    try {
      const res = await fetch('/api/auth/strava-disconnect', { method: 'POST' })
      if (res.redirected) {
        window.location.href = res.url
      } else if (!res.ok) {
        toast.error('연결 해제에 실패했습니다.')
        setDisconnecting(false)
      }
    } catch {
      toast.error('오류가 발생했습니다. 다시 시도해주세요.')
      setDisconnecting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Strava 연동</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Athlete ID:</span>
            <span className="font-mono">{athleteId}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">토큰 상태:</span>
            {isTokenValid ? (
              <span className="text-green-600 font-medium">유효</span>
            ) : (
              <span className="text-destructive font-medium">만료됨</span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          disabled={disconnecting}
        >
          {disconnecting ? '해제 중...' : '연결 해제'}
        </Button>
      </CardContent>
    </Card>
  )
}
