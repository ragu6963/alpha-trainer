'use client'

import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type ChartActivity = {
  id: string
  startDate: string
  distance: number
  averageSpeed: number
  averageHeartrate?: number | null
  maxHeartrate?: number | null
  totalElevationGain?: number | null
  calories?: number | null
  averageCadence?: number | null
  movingTime?: number
  elapsedTime?: number
  maxSpeed?: number | null
}

export function ChartSection({ activities }: { activities: ChartActivity[] }) {
  const [period, setPeriod] = useState<'4w' | '3m' | '6m'>('4w')

  const chartData = useMemo(() => {
    // Determine start date based on period
    const now = new Date()
    const startDate = new Date(now)
    if (period === '4w') {
      startDate.setDate(now.getDate() - 28)
    } else if (period === '3m') {
      startDate.setMonth(now.getMonth() - 3)
    } else {
      startDate.setMonth(now.getMonth() - 6)
    }

    startDate.setHours(0, 0, 0, 0)

    const filtered = activities.filter((a) => new Date(a.startDate) >= startDate)

    // Data maps
    const weekMap = new Map<number, { 
      dateLabel: string; 
      distance: number; 
      count: number; 
      movingTime: number; 
      elevation: number; 
      calories: number; 
    }>()
    const monthMap = new Map<
      number,
      { 
        dateLabel: string; 
        speedSum: number; 
        speedCount: number;
        hrSum: number;
        hrCount: number;
        cadenceSum: number;
        cadenceCount: number;
      }
    >()

    // Helper: get monday 00:00:00 of the given date
    const getWeekStart = (d: Date) => {
      const date = new Date(d)
      const day = date.getDay()
      const diff = date.getDate() - day + (day === 0 ? -6 : 1)
      return new Date(date.setDate(diff)).setHours(0, 0, 0, 0)
    }

    // Helper: get month 00:00:00
    const getMonthStart = (d: Date) => {
      return new Date(d.getFullYear(), d.getMonth(), 1).setHours(0, 0, 0, 0)
    }

    // Initialize consecutive weeks
    let w = getWeekStart(startDate)
    const endW = getWeekStart(now)
    while (w <= endW) {
      const wd = new Date(w)
      const label = `${wd.getMonth() + 1}/${wd.getDate()}`
      weekMap.set(w, { dateLabel: label, distance: 0, count: 0, movingTime: 0, elevation: 0, calories: 0 })
      w += 7 * 24 * 60 * 60 * 1000
    }

    // Initialize consecutive months for pace
    let m = getMonthStart(startDate)
    const endM = getMonthStart(now)
    while (m <= endM) {
      const md = new Date(m)
      const label = `${md.getMonth() + 1}월`
      monthMap.set(m, { dateLabel: label, speedSum: 0, speedCount: 0, hrSum: 0, hrCount: 0, cadenceSum: 0, cadenceCount: 0 })
      m = new Date(md.getFullYear(), md.getMonth() + 1, 1).getTime()
    }

    // Aggregate
    filtered.forEach((a) => {
      const d = new Date(a.startDate)

      const ws = getWeekStart(d)
      if (weekMap.has(ws)) {
        const weekData = weekMap.get(ws)!
        weekData.distance += a.distance / 1000 // Convert to km
        weekData.count += 1
        weekData.movingTime += (a.movingTime || 0)
        weekData.elevation += (a.totalElevationGain || 0)
        weekData.calories += (a.calories || 0)
      }

      const ms = getMonthStart(d)
      if (monthMap.has(ms)) {
        const monthData = monthMap.get(ms)!
        monthData.speedSum += a.averageSpeed
        monthData.speedCount += 1
        if (a.averageHeartrate) {
          monthData.hrSum += a.averageHeartrate
          monthData.hrCount += 1
        }
        if (a.averageCadence) {
          monthData.cadenceSum += a.averageCadence
          monthData.cadenceCount += 1
        }
      }
    })

    const weeklyData = Array.from(weekMap.values()).map((v) => ({
      name: v.dateLabel,
      거리: Number(v.distance.toFixed(1)),
      빈도: v.count,
      시간: Number((v.movingTime / 3600).toFixed(1)), // Hours
      고도: Math.round(v.elevation),
      칼로리: Math.round(v.calories),
    }))

    const monthlyData = Array.from(monthMap.values())
      .map((v) => {
        let paceValue = 0
        let paceLabel = "0'00\""
        if (v.speedCount > 0) {
          const avgSpeed = v.speedSum / v.speedCount // m/s
          if (avgSpeed > 0) {
            const paceSec = 1000 / avgSpeed
            const pm = Math.floor(paceSec / 60)
            const ps = Math.floor(paceSec % 60)
            paceValue = pm + ps / 60 // decimal minutes for chart Y-axis
            paceLabel = `${pm}'${ps.toString().padStart(2, '0')}"`
          }
        }
        return {
          name: v.dateLabel,
          페이스: paceValue,
          paceLabel,
          평균심박수: v.hrCount > 0 ? Math.round(v.hrSum / v.hrCount) : null,
          평균케이던스: v.cadenceCount > 0 ? Math.round((v.cadenceSum / v.cadenceCount) * 2) : null,
        }
      })

    return { weeklyData, monthlyData }
  }, [activities, period])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold">러닝 트렌드</h2>
        <Tabs
          value={period}
          onValueChange={(v) => setPeriod(v as '4w' | '3m' | '6m')}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-3 sm:w-[300px]">
            <TabsTrigger value="4w">최근 4주</TabsTrigger>
            <TabsTrigger value="3m">3개월</TabsTrigger>
            <TabsTrigger value="6m">6개월</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* 주간 거리 추이 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              주간 거리 추이 (km)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.weeklyData}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} width={30} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '8px', fontSize: '14px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="거리" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 주간 러닝 빈도 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              주간 러닝 빈도 (회)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.weeklyData}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} width={20} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '8px', fontSize: '14px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="빈도" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>



        {/* 주간 훈련 시간 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              주간 훈련 시간 (시간)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.weeklyData}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} width={30} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ borderRadius: '8px', fontSize: '14px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="시간" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>


      </div>
    </div>
  )
}
