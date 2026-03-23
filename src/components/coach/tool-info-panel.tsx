'use client'

import { useState } from 'react'
import { ChevronDown, Wrench } from 'lucide-react'

type Param = {
  name: string
  type: string
  required: boolean
  description: string
}

type ToolInfo = {
  name: string
  label: string
  description: string
  params: Param[]
}

const TOOLS: ToolInfo[] = [
  {
    name: 'getRecentActivities',
    label: '최근 활동 조회',
    description: '최근 N회 또는 기간별 러닝 활동 목록을 가져옵니다.',
    params: [
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: '조회할 최대 활동 수 (기본 10, 최대 50)',
      },
      {
        name: 'days',
        type: 'number',
        required: false,
        description: '최근 N일 이내 활동만 조회 (기본 제한 없음, 최대 365)',
      },
    ],
  },
  {
    name: 'getActivityStats',
    label: '기간별 통계',
    description: '기간별 러닝 통계를 주간·월간·전체 단위로 집계합니다.',
    params: [
      {
        name: 'periodDays',
        type: 'number',
        required: true,
        description: '집계할 기간 (일 단위, 예: 28=4주, 90=3개월, 최대 365)',
      },
      {
        name: 'groupBy',
        type: '"week" | "month" | "total"',
        required: true,
        description: '집계 단위: week(주간), month(월간), total(전체 합산)',
      },
    ],
  },
  {
    name: 'getPersonalBests',
    label: '개인 최고 기록',
    description: '특정 거리에서의 최고 기록 Top 5를 조회합니다.',
    params: [
      {
        name: 'distanceKm',
        type: 'number',
        required: true,
        description: '기준 거리 (km). 예: 5, 10, 21.1, 42.195',
      },
      {
        name: 'tolerancePct',
        type: 'number',
        required: false,
        description: '거리 허용 오차 비율 (%, 기본 10%). 예: 10이면 ±10% 이내 활동 포함',
      },
    ],
  },
  {
    name: 'getActivityDetail',
    label: '활동 상세 조회',
    description: '특정 활동의 상세 정보와 랩(구간) 데이터를 가져옵니다.',
    params: [
      {
        name: 'activityId',
        type: 'string (UUID)',
        required: true,
        description: '조회할 활동의 UUID. getRecentActivities로 먼저 ID를 확인하세요.',
      },
    ],
  },
  {
    name: 'searchActivities',
    label: '활동 검색',
    description: '활동명 키워드 또는 날짜 범위로 러닝 기록을 검색합니다.',
    params: [
      {
        name: 'keyword',
        type: 'string',
        required: false,
        description: '활동명에 포함된 키워드 (예: "한강", "마라톤")',
      },
      {
        name: 'startDate',
        type: 'string (ISO)',
        required: false,
        description: '검색 시작 날짜 (ISO 형식, 예: "2025-01-01")',
      },
      {
        name: 'endDate',
        type: 'string (ISO)',
        required: false,
        description: '검색 종료 날짜 (ISO 형식, 예: "2025-03-31")',
      },
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: '최대 결과 수 (기본 10, 최대 20)',
      },
    ],
  },
]

function ToolCard({ tool }: { tool: ToolInfo }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs text-muted-foreground shrink-0 hidden sm:block">
            {tool.name}
          </span>
          <span className="font-medium text-sm truncate">{tool.label}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 ml-2 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground pt-2">{tool.description}</p>
          <div className="space-y-1.5">
            {tool.params.map((p) => (
              <div key={p.name} className="rounded-md bg-background border border-border px-2.5 py-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <code className="text-xs font-semibold text-foreground">{p.name}</code>
                  <code className="text-xs text-muted-foreground">{p.type}</code>
                  {p.required ? (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 font-medium">
                      필수
                    </span>
                  ) : (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                      선택
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ToolInfoPanel() {
  const [open, setOpen] = useState(false)

  return (
    <div className="px-3 pb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        <Wrench className="w-3 h-3" />
        <span>AI가 사용할 수 있는 도구 ({TOOLS.length}개)</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="mt-2 space-y-1.5">
          {TOOLS.map((tool) => (
            <ToolCard key={tool.name} tool={tool} />
          ))}
        </div>
      )}
    </div>
  )
}
