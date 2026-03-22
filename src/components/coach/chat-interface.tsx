'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { type CoachResponse, workoutLabels } from '@/lib/coach-response.schema'

type Props = {
  hasApiKey: boolean
  modelLabel: string
  conversationId: string | null
  onConversationCreated?: (id: string) => void
}

type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; response: CoachResponse }

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

function AssistantBubble({ response }: { response: CoachResponse }) {
  return (
    <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-3 bg-muted text-base leading-relaxed space-y-1">
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
  )
}

export default function ChatInterface({ hasApiKey, modelLabel, conversationId, onConversationCreated }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [started, setStarted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Fetch messages when conversationId changes
  useEffect(() => {
    if (conversationId) {
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

    // CoreMessage 형식으로 변환 (assistant는 text + 훈련 추천 요약 포함)
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
      
      // Remove conversationId from response object so it matches schema strictly if needed,
      // but the API returned it. We can just pass the rest as response.
      const coachResponse: CoachResponse = {
        text: response.text,
        bullets: response.bullets,
        workout: response.workout,
        weekPlan: response.weekPlan,
      }

      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', response: coachResponse }])
      
      if (!conversationId && newConvId && onConversationCreated) {
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
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
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

  if (!started) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
          {modelLabel}
        </div>
        <div className="flex flex-col items-center justify-center flex-1 gap-6 py-8">
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
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
        {modelLabel}
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-4 px-3">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            <p>러닝에 대해 무엇이든 물어보세요!</p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'user' ? (
              <div className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-3 bg-primary text-primary-foreground text-base leading-relaxed">
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            ) : (
              <AssistantBubble response={m.response} />
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

      <form onSubmit={handleSubmit} className="flex gap-2 pt-3 p-3">
        <input
          className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          placeholder="러닝에 대해 무엇이든 물어보세요..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="inline-flex items-center justify-center rounded-full w-11 h-11 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
          aria-label="전송"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </form>
    </div>
  )
}
