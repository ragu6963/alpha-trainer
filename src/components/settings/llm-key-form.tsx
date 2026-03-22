'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const GEMINI_MODELS = [
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (기본 권장)' },
  { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite (경량)' },
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (고성능)' },
]

type SavedKey = {
  provider: string
  model: string
  maskedKey: string
  updatedAt: string
}

export default function LLMKeyForm({ savedKeys }: { savedKeys: SavedKey[] }) {
  const geminiKey = savedKeys.find((k) => k.provider === 'gemini')

  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(geminiKey?.model ?? 'gemini-3-flash-preview')
  const [validating, setValidating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleValidate() {
    if (!apiKey.trim()) {
      toast.error('API 키를 입력해주세요.')
      return
    }
    setValidating(true)
    try {
      const res = await fetch('/api/settings/llm-key/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, model }),
      })
      const data = await res.json()
      if (data.valid) {
        toast.success('API 키가 유효합니다!')
      } else {
        toast.error(`키 검증 실패: ${data.message ?? '알 수 없는 오류'}`)
      }
    } catch {
      toast.error('검증 중 오류가 발생했습니다.')
    } finally {
      setValidating(false)
    }
  }

  async function handleSave() {
    if (!apiKey.trim()) {
      toast.error('API 키를 입력해주세요.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/settings/llm-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'gemini', model, apiKey }),
      })
      if (res.ok) {
        toast.success('API 키가 저장되었습니다.')
        setApiKey('')
        // 페이지 새로고침으로 마스킹된 키 반영
        window.location.reload()
      } else {
        const data = await res.json()
        toast.error(`저장 실패: ${data.error ?? '알 수 없는 오류'}`)
      }
    } catch {
      toast.error('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Gemini API 키를 삭제하시겠습니까? AI 코치를 사용할 수 없게 됩니다.')) return
    setDeleting(true)
    try {
      const res = await fetch('/api/settings/llm-key', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'gemini' }),
      })
      if (res.ok) {
        toast.success('API 키가 삭제되었습니다.')
        window.location.reload()
      } else {
        toast.error('삭제에 실패했습니다.')
      }
    } catch {
      toast.error('삭제 중 오류가 발생했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Google Gemini</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {geminiKey && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            <span className="text-muted-foreground">등록된 키: </span>
            <span className="font-mono">{geminiKey.maskedKey}</span>
            <span className="text-muted-foreground ml-2">({geminiKey.model})</span>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">모델 선택</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {GEMINI_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            API 키 {geminiKey ? '(교체)' : ''}
          </label>
          <Input
            type="password"
            placeholder="AIza..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleValidate}
            disabled={validating || !apiKey.trim()}
          >
            {validating ? '검증 중...' : '키 검증'}
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !apiKey.trim()}
          >
            {saving ? '저장 중...' : '저장'}
          </Button>
          {geminiKey && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '삭제 중...' : '키 삭제'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
