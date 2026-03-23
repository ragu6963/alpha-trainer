'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { type CoachResponse, workoutLabels } from '@/lib/coach-response.schema'
import ToolInfoPanel from './tool-info-panel'

type Props = {
  hasApiKey: boolean
  modelLabel: string
  conversationId: string | null
  onConversationCreated?: (id: string) => void
}

type ToolCall = { toolName: string; args: Record<string, unknown> }

type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; response: CoachResponse; toolCalls?: ToolCall[] }

const QUICK_ACTIONS = [
  {
    label: '내일 훈련 추천',
    description: '내일 달릴 거리와 강도를 추천받아요',
    prompt: '내 러닝 기록을 바탕으로 내일 훈련 계획을 추천해줘.',
  },
  {
    label: '주간 훈련 추천',
    description: '이번 주 전체 훈련 스케줄을 짜드려요',
    prompt: '내 러닝 기록을 바탕으로 이번 주 훈련 계획을 추천해줘.',
  },
  {
    label: '대화하기',
    description: '러닝에 대해 무엇이든 물어보세요',
    prompt: null,
  },
]

const TOOL_LABELS: Record<string, string> = {
  getRecentActivities: '최근 활동 조회',
  getActivityStats: '기간별 통계',
  getPersonalBests: '개인 최고 기록',
  getActivityDetail: '활동 상세 조회',
  searchActivities: '활동 검색',
}

function WorkoutCard({ workout }: { workout: NonNullable<CoachResponse['workout']> }) {
  return (
    <div className="mt-3 rounded-xl border border-border bg-background p-4 space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">{workoutLabels[workout.type]}</span>
        <span className="text-sm text-muted-foreground">{workout.distanceKm}km</span>
        {workout.paceTarget && (
          <span className="text-sm text-muted-foreground">{workout.paceTarget}</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{workout.notes}</p>
    </div>
  )
}

function WeekPlanTable({ weekPlan }: { weekPlan: NonNullable<CoachResponse['weekPlan']> }) {
  return (
    <div className="mt-3 rounded-xl border border-border bg-background overflow-hidden">
      {weekPlan.map((day) => (
        <div key={day.day} className="flex gap-3 px-4 py-2.5 border-b border-border last:border-b-0">
          <span className="w-5 shrink-0 text-sm font-medium">{day.day}</span>
          <span className="w-14 shrink-0 text-sm text-muted-foreground">{workoutLabels[day.type]}</span>
          {day.distanceKm != null && (
            <span className="w-12 shrink-0 text-sm text-muted-foreground">{day.distanceKm}km</span>
          )}
          {day.notes && (
            <span className="text-sm text-muted-foreground leading-snug">{day.notes}</span>
          )}
        </div>
      ))}
    </div>
  )
}

function ToolCallBadge({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-2 max-w-[80%]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-full border border-border bg-background/80 px-2.5 py-1"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
        <span>도구 {toolCalls.length}회 사용</span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="mt-1.5 space-y-1.5">
          {toolCalls.map((tc, i) => (
            <div key={i} className="rounded-lg border border-border bg-background/80 px-2.5 py-2 text-xs">
              <div className="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                <span className="font-medium text-foreground">
                  {TOOL_LABELS[tc.toolName] ?? tc.toolName}
                </span>
              </div>
              {Object.keys(tc.args).length > 0 && (
                <div className="mt-1.5 space-y-0.5 pl-4.5">
                  {Object.entries(tc.args).map(([k, v]) => (
                    <div key={k} className="flex gap-1.5 text-muted-foreground flex-wrap">
                      <code className="shrink-0 text-muted-foreground/70">{k}:</code>
                      <code className="break-all">{String(v)}</code>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AssistantBubble({ response, toolCalls }: { response: CoachResponse; toolCalls?: ToolCall[] }) {
  return (
    <div className="max-w-[80%] space-y-1">
      {toolCalls && toolCalls.length > 0 && <ToolCallBadge toolCalls={toolCalls} />}
      <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-muted text-base leading-relaxed space-y-1">
        <p>{response.text}</p>
        {response.bullets && response.bullets.length > 0 && (
          <ul className="mt-2 space-y-1">
            {response.bullets.map((b, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="shrink-0">·</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
        {response.workout && <WorkoutCard workout={response.workout} />}
        {response.weekPlan && <WeekPlanTable weekPlan={response.weekPlan} />}
      </div>
    </div>
  )
}

export function ChatPanel({ hasApiKey, modelLabel, conversationId, onConversationCreated }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [started, setStarted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const justCreatedId = useRef<string | null>(null)

  useEffect(() => {
    if (conversationId) {
      if (justCreatedId.current === conversationId) {
        justCreatedId.current = null
        return
      }
      setIsLoading(true)
      fetch(`/api/coach/conversations/${conversationId}/messages`)
        .then(res => res.json())
        .then(data => {
          if (data.messages) {
            setMessages(data.messages)
            setStarted(true)
          }
        })
        .catch(err => {
          console.error(err)
          setError('메시지를 불러오는데 실패했습니다.')
        })
        .finally(() => setIsLoading(false))
    } else {
      setMessages([])
      setStarted(false)
      setError(null)
    }
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function send(text: string) {
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setIsLoading(true)
    setError(null)

    const apiMessages = nextMessages.map((m) => {
      if (m.role === 'user') return { role: 'user' as const, content: m.text }
      const r = m.response
      const parts: string[] = [r.text]
      if (r.workout) {
        parts.push(
          `[추천 훈련: ${r.workout.type} ${r.workout.distanceKm}km${r.workout.paceTarget ? ` @ ${r.workout.paceTarget}` : ''} — ${r.workout.notes}]`
        )
      }
      if (r.weekPlan) {
        const summary = r.weekPlan
          .map((d) => `${d.day}: ${d.type}${d.distanceKm != null ? ` ${d.distanceKm}km` : ''}`)
          .join(', ')
        parts.push(`[주간 계획: ${summary}]`)
      }
      return { role: 'assistant' as const, content: parts.join('\n') }
    })

    try {
      const res = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, conversationId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message ?? data.error ?? '오류가 발생했습니다.')
      }

      const response = await res.json()
      const newConvId = response.conversationId

      const coachResponse: CoachResponse = {
        text: response.text,
        bullets: response.bullets,
        workout: response.workout,
        weekPlan: response.weekPlan,
      }

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', response: coachResponse, toolCalls: response.toolCalls },
      ])

      if (!conversationId && newConvId && onConversationCreated) {
        justCreatedId.current = newConvId
        onConversationCreated(newConvId)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    send(text)
  }

  function handleQuickAction(prompt: string | null) {
    setStarted(true)
    if (prompt) send(prompt)
  }

  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-4">
        <p className="text-muted-foreground">
          AI 코치를 사용하려면 먼저 Gemini API 키를 등록해야 합니다.
        </p>
        <Link
          href="/settings"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          설정에서 API 키 등록하기 →
        </Link>
      </div>
    )
  }

  // 채팅 헤더 (모델 표시 + 도구 패널)
  const chatHeader = (
    <div className="shrink-0">
      <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground border-b">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
        {modelLabel}
      </div>
      <ToolInfoPanel />
    </div>
  )

  if (!started) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {chatHeader}
        <div className="flex flex-col items-center justify-center flex-1 gap-6 py-8 px-4">
          <div className="text-center">
            <p className="text-2xl mb-2">👟</p>
            <p className="text-lg font-medium">안녕하세요! 러닝 코치입니다.</p>
            <p className="text-muted-foreground text-sm mt-1">오늘 무엇을 도와드릴까요?</p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-sm">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.prompt)}
                className="flex flex-col items-start gap-0.5 rounded-xl border border-input bg-background px-5 py-4 text-left hover:bg-muted transition-colors cursor-pointer"
              >
                <span className="font-medium">{action.label}</span>
                <span className="text-sm text-muted-foreground">{action.description}</span>
              </button>
            ))}
          </div>
        </div>
        <ChatInput
          input={input}
          isLoading={isLoading}
          onChange={setInput}
          onSubmit={handleSubmit}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {chatHeader}

      {/* 메시지 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 px-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            러닝에 대해 무엇이든 물어보세요!
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'user' ? (
              <div className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-3 bg-primary text-primary-foreground text-base leading-relaxed">
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            ) : (
              <AssistantBubble response={m.response} toolCalls={m.toolCalls} />
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-sm text-destructive">{error}</div>
        )}

        <div ref={bottomRef} />
      </div>

      <ChatInput
        input={input}
        isLoading={isLoading}
        onChange={setInput}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

function ChatInput({
  input,
  isLoading,
  onChange,
  onSubmit,
}: {
  input: string
  isLoading: boolean
  onChange: (v: string) => void
  onSubmit: (e: React.SyntheticEvent) => void
}) {
  return (
    <div className="shrink-0 px-4 pb-4 pt-2 border-t bg-background">
      <form
        onSubmit={onSubmit}
        className="flex gap-2 items-center rounded-2xl border border-input bg-background shadow-sm px-3 py-2"
      >
        <input
          className="flex-1 bg-transparent px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          placeholder="러닝에 대해 무엇이든 물어보세요..."
          value={input}
          onChange={(e) => onChange(e.target.value)}
          disabled={isLoading}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="inline-flex items-center justify-center rounded-full w-9 h-9 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
          aria-label="전송"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </form>
    </div>
  )
}
