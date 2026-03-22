'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

const CONFIRM_TEXT = '계정 삭제'

export default function DeleteAccountDialog() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (input !== CONFIRM_TEXT) {
      toast.error(`"${CONFIRM_TEXT}"을(를) 정확히 입력해주세요.`)
      return
    }

    setDeleting(true)
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'DELETE' })
      if (res.ok || res.redirected) {
        // 세션 무효화 후 리다이렉트
        window.location.href = '/'
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(`삭제 실패: ${data.error ?? '알 수 없는 오류'}`)
        setDeleting(false)
      }
    } catch {
      toast.error('오류가 발생했습니다. 다시 시도해주세요.')
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setInput('') }}>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
        계정 삭제
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>계정을 삭제하시겠습니까?</DialogTitle>
          <DialogDescription>
            이 작업은 <strong>되돌릴 수 없습니다.</strong> 모든 러닝 기록, AI 대화 내역,
            API 키가 영구적으로 삭제됩니다. Strava 연동도 해제됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <p className="text-sm text-muted-foreground">
            계속하려면 아래에{' '}
            <span className="font-mono font-semibold text-foreground">{CONFIRM_TEXT}</span>
            을(를) 입력하세요.
          </p>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={CONFIRM_TEXT}
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || input !== CONFIRM_TEXT}
          >
            {deleting ? '삭제 중...' : '영구 삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
