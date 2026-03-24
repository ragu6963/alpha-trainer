'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type GoalData = {
  goalType: string
  targetRaceDate: string | null
  targetRaceName: string | null
  targetDistanceKm: number | null
  targetFinishTime: string | null
  weeklyDistanceGoalKm: number | null
  weeklyRunCountGoal: number | null
  memo: string | null
}

const GOAL_TYPES = [
  { value: 'race_completion', label: '레이스 완주' },
  { value: 'pace_improvement', label: '페이스 단축' },
  { value: 'distance_increase', label: '거리 늘리기' },
  { value: 'frequency', label: '빈도 증가' },
]

function parseFinishTime(time: string | null) {
  if (!time) return { hours: '', minutes: '', seconds: '' }
  const parts = time.split(':')
  return {
    hours: parts[0] ?? '',
    minutes: parts[1] ?? '',
    seconds: parts[2] ?? '',
  }
}

export default function GoalForm({ savedGoal }: { savedGoal: GoalData | null }) {
  const [goalType, setGoalType] = useState(savedGoal?.goalType ?? 'race_completion')
  const [targetRaceDate, setTargetRaceDate] = useState(savedGoal?.targetRaceDate?.slice(0, 10) ?? '')
  const [targetRaceName, setTargetRaceName] = useState(savedGoal?.targetRaceName ?? '')
  const [targetDistanceKm, setTargetDistanceKm] = useState(savedGoal?.targetDistanceKm?.toString() ?? '')
  const parsed = parseFinishTime(savedGoal?.targetFinishTime ?? null)
  const [finishHours, setFinishHours] = useState(parsed.hours)
  const [finishMinutes, setFinishMinutes] = useState(parsed.minutes)
  const [finishSeconds, setFinishSeconds] = useState(parsed.seconds)
  const [weeklyDistanceGoalKm, setWeeklyDistanceGoalKm] = useState(
    savedGoal?.weeklyDistanceGoalKm?.toString() ?? ''
  )
  const [weeklyRunCountGoal, setWeeklyRunCountGoal] = useState(
    savedGoal?.weeklyRunCountGoal?.toString() ?? ''
  )
  const [memo, setMemo] = useState(savedGoal?.memo ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function calcPacePerKm() {
    const dist = parseFloat(targetDistanceKm)
    const h = parseInt(finishHours || '0')
    const m = parseInt(finishMinutes || '0')
    const s = parseInt(finishSeconds || '0')
    if (!dist || dist <= 0 || (!h && !m && !s)) return null
    const totalSec = h * 3600 + m * 60 + s
    const paceSecPerKm = totalSec / dist
    const paceMin = Math.floor(paceSecPerKm / 60)
    const paceSec = Math.round(paceSecPerKm % 60)
    return `${paceMin}:${String(paceSec).padStart(2, '0')}`
  }

  function buildFinishTime() {
    if (!finishHours && !finishMinutes && !finishSeconds) return null
    const h = (finishHours || '0').padStart(1, '0')
    const m = (finishMinutes || '0').padStart(2, '0')
    const s = (finishSeconds || '0').padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/goal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalType,
          targetRaceDate: targetRaceDate || null,
          targetRaceName: targetRaceName || null,
          targetDistanceKm: targetDistanceKm ? parseFloat(targetDistanceKm) : null,
          targetFinishTime: buildFinishTime(),
          weeklyDistanceGoalKm: weeklyDistanceGoalKm ? parseFloat(weeklyDistanceGoalKm) : null,
          weeklyRunCountGoal: weeklyRunCountGoal ? parseInt(weeklyRunCountGoal) : null,
          memo: memo || null,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('훈련 목표가 저장되었어요.')
    } catch {
      toast.error('저장 중 오류가 발생했어요.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch('/api/settings/goal', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setGoalType('race_completion')
      setTargetRaceDate('')
      setTargetRaceName('')
      setTargetDistanceKm('')
      setFinishHours('')
      setFinishMinutes('')
      setFinishSeconds('')
      setWeeklyDistanceGoalKm('')
      setWeeklyRunCountGoal('')
      setMemo('')
      toast.success('훈련 목표가 삭제되었어요.')
    } catch {
      toast.error('삭제 중 오류가 발생했어요.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium">목표 유형</label>
        <div className="flex flex-wrap gap-2">
          {GOAL_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setGoalType(t.value)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                goalType === t.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {(goalType === 'race_completion' || goalType === 'pace_improvement') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">목표 레이스명</label>
            <Input
              placeholder="예: 서울 하프마라톤"
              value={targetRaceName}
              onChange={(e) => setTargetRaceName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">목표 날짜</label>
            <Input
              type="date"
              value={targetRaceDate}
              onChange={(e) => setTargetRaceDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">목표 거리 (km)</label>
            <Input
              type="number"
              placeholder="예: 21.1"
              value={targetDistanceKm}
              onChange={(e) => setTargetDistanceKm(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">목표 완주 시간</label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                placeholder="시간"
                value={finishHours}
                onChange={(e) => setFinishHours(e.target.value)}
                className="w-16 text-center"
              />
              <span className="text-sm text-muted-foreground">시</span>
              <Input
                type="number"
                min={0}
                max={59}
                placeholder="분"
                value={finishMinutes}
                onChange={(e) => setFinishMinutes(e.target.value)}
                className="w-16 text-center"
              />
              <span className="text-sm text-muted-foreground">분</span>
              <Input
                type="number"
                min={0}
                max={59}
                placeholder="초"
                value={finishSeconds}
                onChange={(e) => setFinishSeconds(e.target.value)}
                className="w-16 text-center"
              />
              <span className="text-sm text-muted-foreground">초</span>
            </div>
            {calcPacePerKm() && (
              <p className="text-xs text-muted-foreground">
                예상 페이스: <span className="font-medium text-foreground">{calcPacePerKm()} /km</span>
              </p>
            )}
          </div>
        </div>
      )}

      {goalType === 'distance_increase' && (
        <div className="space-y-1">
          <label className="text-sm font-medium">주간 목표 거리 (km)</label>
          <Input
            type="number"
            placeholder="예: 35"
            value={weeklyDistanceGoalKm}
            onChange={(e) => setWeeklyDistanceGoalKm(e.target.value)}
          />
        </div>
      )}

      {goalType === 'frequency' && (
        <div className="space-y-1">
          <label className="text-sm font-medium">주간 목표 횟수</label>
          <Input
            type="number"
            placeholder="예: 4"
            value={weeklyRunCountGoal}
            onChange={(e) => setWeeklyRunCountGoal(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium">메모 (선택)</label>
        <Input
          placeholder="추가 목표나 참고사항"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </Button>
        {savedGoal && (
          <Button variant="outline" onClick={handleDelete} disabled={deleting}>
            {deleting ? '삭제 중...' : '목표 삭제'}
          </Button>
        )}
      </div>
    </div>
  )
}
