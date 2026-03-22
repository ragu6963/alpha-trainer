'use client'

import dynamic from 'next/dynamic'
import type { ChartActivity } from './chart-section'

const ChartSection = dynamic(
  () => import('./chart-section').then((mod) => ({ default: mod.ChartSection })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[400px] animate-pulse bg-muted/30 rounded-lg" />
    ),
  }
)

export default function ChartSectionClient({ activities }: { activities: ChartActivity[] }) {
  return <ChartSection activities={activities} />
}
