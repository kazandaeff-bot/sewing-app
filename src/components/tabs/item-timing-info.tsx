'use client'

import { Clock } from 'lucide-react'
import { formatTiming } from '@/lib/formatters'

interface ItemTimingInfoProps {
  item: {
    startedAt?: string | null
    ironedAt?: string | null
    qcAt?: string | null
    completedAt?: string | null
  }
}

export function ItemTimingInfo({ item }: ItemTimingInfoProps) {
  const timings: string[] = []
  const started = formatTiming(item.startedAt)
  if (started) timings.push(`В работе с: ${started}`)
  const ironed = formatTiming(item.ironedAt)
  if (ironed) timings.push(`Отглажено: ${ironed}`)
  const qc = formatTiming(item.qcAt)
  if (qc) timings.push(`ОТК: ${qc}`)
  const completed = formatTiming(item.completedAt)
  if (completed) timings.push(`Завершено: ${completed}`)
  if (timings.length === 0) return null
  return (
    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
      <Clock className="h-3 w-3 shrink-0" />
      {timings.join(' → ')}
    </div>
  )
}
