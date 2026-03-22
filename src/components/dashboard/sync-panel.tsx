'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type SyncState =
  | { status: 'idle' }
  | { status: 'syncing'; synced: number; total: number }
  | { status: 'done'; synced: number }
  | { status: 'error'; message: string }

function formatRelativeTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

function errorMessage(code: string): string {
  if (code === 'STRAVA_RATE_LIMITED')
    return 'Strava API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.'
  if (code === 'STRAVA_UNAUTHORIZED' || code === 'STRAVA_TOKEN_REFRESH_FAILED')
    return 'Strava 인증이 만료되었습니다. 다시 로그인해주세요.'
  return '동기화 중 오류가 발생했습니다.'
}

export default function SyncPanel({
  lastSyncedAt,
}: {
  lastSyncedAt: Date | null
}) {
  const [syncState, setSyncState] = useState<SyncState>({ status: 'idle' })
  const [lastSynced, setLastSynced] = useState<Date | null>(lastSyncedAt)

  async function handleSync() {
    setSyncState({ status: 'syncing', synced: 0, total: 0 })

    try {
      const res = await fetch('/api/strava/sync', { method: 'POST' })

      if (!res.ok || !res.body) {
        const msg = '동기화 요청에 실패했습니다.'
        setSyncState({ status: 'error', message: msg })
        toast.error(msg)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          const msg = JSON.parse(line) as {
            type: string
            total?: number
            synced?: number
            error?: string
          }

          if (msg.type === 'start') {
            setSyncState({
              status: 'syncing',
              synced: 0,
              total: msg.total ?? 0,
            })
          } else if (msg.type === 'progress') {
            setSyncState((prev) =>
              prev.status === 'syncing'
                ? { ...prev, synced: msg.synced ?? 0 }
                : prev
            )
          } else if (msg.type === 'done') {
            const synced = msg.synced ?? 0
            setSyncState({ status: 'done', synced })
            setLastSynced(new Date())
            toast.success(`${synced}개의 활동이 동기화되었습니다`)
          } else if (msg.type === 'error') {
            const text = errorMessage(msg.error ?? '')
            setSyncState({ status: 'error', message: text })
            toast.error(text)
          }
        }
      }
    } catch {
      const msg = '동기화 중 네트워크 오류가 발생했습니다.'
      setSyncState({ status: 'error', message: msg })
      toast.error(msg)
    }
  }

  const isSyncing = syncState.status === 'syncing'
  const progressPct =
    syncState.status === 'syncing' && syncState.total > 0
      ? Math.min((syncState.synced / syncState.total) * 100, 100)
      : 0

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Strava 동기화</p>
          <p className="text-xs text-muted-foreground">
            {lastSynced
              ? `마지막 동기화: ${formatRelativeTime(lastSynced)}`
              : '아직 동기화하지 않았습니다'}
          </p>
        </div>
        <Button onClick={handleSync} disabled={isSyncing} size="sm">
          {isSyncing ? '동기화 중...' : '동기화'}
        </Button>
      </div>

      {syncState.status === 'syncing' && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>러닝 활동 수집 중...</span>
            <span>
              {syncState.synced}
              {syncState.total > 0 ? ` / ${syncState.total}` : ''}개
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {syncState.status === 'error' && (
        <p className="text-xs text-destructive">{syncState.message}</p>
      )}

      {syncState.status === 'done' && syncState.synced === 0 && (
        <p className="text-xs text-muted-foreground">
          새로운 러닝 활동이 없습니다.
        </p>
      )}
    </div>
  )
}
