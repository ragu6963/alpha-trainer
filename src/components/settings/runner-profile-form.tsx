'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type RunnerProfile = {
  birthYear: number | null
  measuredMaxHR: number | null
}

export default function RunnerProfileForm({ profile }: { profile: RunnerProfile }) {
  const [birthYear, setBirthYear] = useState(profile.birthYear?.toString() ?? '')
  const [measuredMaxHR, setMeasuredMaxHR] = useState(profile.measuredMaxHR?.toString() ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthYear: birthYear ? parseInt(birthYear) : null,
          measuredMaxHR: measuredMaxHR ? parseInt(measuredMaxHR) : null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message ?? '저장 실패')
      }
      toast.success('러너 프로필이 저장되었어요.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장 중 오류가 발생했어요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">출생연도</label>
          <Input
            type="number"
            placeholder="예: 1990"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">최대 심박수 추정(220-나이)에 사용됩니다.</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">최대 심박수 (직접 측정)</label>
          <Input
            type="number"
            placeholder="예: 185"
            value={measuredMaxHR}
            onChange={(e) => setMeasuredMaxHR(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">직접 측정값이 있으면 추정식보다 우선 적용됩니다.</p>
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? '저장 중...' : '저장'}
      </Button>
    </div>
  )
}
