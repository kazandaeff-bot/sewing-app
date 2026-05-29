'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  CheckCircle2,
  Heater,
  Loader2,
  ShieldCheck,
  Wallet,
} from 'lucide-react'

import type { SewingTaskResponse, SewingTaskItemResponse, IroningGroup } from '@/types'
import { getPeriodLabel } from '@/lib/formatters'
import { getItemStatusBadge } from '@/lib/status-badges'
import { ItemTimingInfo } from '@/components/tabs/item-timing-info'
import { useSalaryCalculation } from '@/hooks/use-salary-calculation'
import { apiGet, apiPatch } from '@/lib/api-client'
import { DEFAULT_IRONING_RATE } from '@/lib/constants'

// ============ TAB: ВТО (Ironing) ============
export function IroningTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [salaryPeriod, setSalaryPeriod] = useState<'week' | 'month' | 'all'>('month')

  const { data: ironingGroups = [], isLoading: ironingLoading } = useQuery({
    queryKey: ['ironing-items'],
    queryFn: () => apiGet<IroningGroup[]>('/api/ironing'),
  })

  // Fetch all sewing tasks to find ironed items for salary calc
  const { data: allSewingTasks = [] } = useQuery({
    queryKey: ['sewing-tasks', 'ironing-all'],
    queryFn: () => apiGet<SewingTaskResponse[]>('/api/sewing-tasks'),
  })

  const ironingMutation = useMutation({
    mutationFn: (itemIds: string[]) =>
      apiPatch('/api/ironing', { itemIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ironing-items'] })
      queryClient.invalidateQueries({ queryKey: ['sewing-tasks'] })
      toast({ title: 'Отглажено', description: 'Изделия отмечены как отглаженные и переданы на ОТК' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить статус', variant: 'destructive' })
    },
  })

  const handleIronItem = useCallback((itemId: string) => {
    ironingMutation.mutate([itemId])
  }, [ironingMutation])

  const handleIronAll = useCallback(() => {
    const allItemIds = ironingGroups.flatMap((g: any) => g.items.map((i: any) => i.id))
    if (allItemIds.length > 0) {
      ironingMutation.mutate(allItemIds)
    }
  }, [ironingGroups, ironingMutation])

  // Salary calc via shared hook
  const salary = useSalaryCalculation(allSewingTasks, 'ironingRate', 'ironed', salaryPeriod, DEFAULT_IRONING_RATE)
  const periodLabel = getPeriodLabel(salaryPeriod)

  // Ironed items list for "already ironed" display section
  const ironedItems = useMemo(() =>
    allSewingTasks.flatMap((t: SewingTaskResponse) =>
      t.items
        .filter((item: SewingTaskItemResponse) => item.status === 'pending_qc' || item.status === 'completed')
        .map((item: SewingTaskItemResponse) => ({
          ...item,
          taskPlanName: t.cuttingPlan?.plan?.name || '',
          sewerName: t.employee?.name || '',
        }))
    ), [allSewingTasks]
  )

  const totalPendingItems = ironingGroups.reduce((sum: number, g: any) => sum + g.items.length, 0)

  return (
    <div className="space-y-6">
      {/* Зарплата ВТО */}
      <Card className="border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-lg text-purple-700">Расчёт зарплаты {periodLabel}</CardTitle>
            </div>
            <Select value={salaryPeriod} onValueChange={(v) => setSalaryPeriod(v as 'week' | 'month' | 'all')}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">За неделю</SelectItem>
                <SelectItem value="month">За месяц</SelectItem>
                <SelectItem value="all">За всё время</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-white/70 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Отглажено</div>
              <div className="text-2xl font-bold text-purple-700">{salary.totalUnits} шт</div>
            </div>
            <div className="text-center p-3 bg-white/70 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Ставка</div>
              <div className="text-2xl font-bold text-purple-700">{DEFAULT_IRONING_RATE} ₽/шт</div>
            </div>
            <div className="text-center p-3 bg-purple-100 rounded-lg border-2 border-purple-300 col-span-2 sm:col-span-1">
              <div className="text-xs text-purple-700 mb-1 font-medium">Итого зарплата</div>
              <div className="text-2xl font-bold text-purple-800">{salary.totalSalary.toLocaleString('ru-RU')} ₽</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items awaiting ironing */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Heater className="h-5 w-5 text-purple-500" />
            Ожидают утюжки ({totalPendingItems})
          </h3>
          {totalPendingItems > 0 && (
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white min-h-[44px]"
              onClick={handleIronAll}
              disabled={ironingMutation.isPending}
            >
              {ironingMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Отгладить все
            </Button>
          )}
        </div>
        {ironingLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            <span className="ml-2 text-muted-foreground">Загрузка...</span>
          </div>
        ) : ironingGroups.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Heater className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Нет изделий, ожидающих утюжки</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {ironingGroups.map((group: any) => (
              <Card key={group.task.id} className="border-purple-200 hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">Задание #{group.task.id.slice(-6)}</CardTitle>
                      <CardDescription className="text-xs">
                        План: {group.task.cuttingPlan?.plan?.name || '—'} • Швея: {group.task.employee?.name || '—'}
                      </CardDescription>
                    </div>
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs">На ВТО</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.items.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between gap-3 border rounded-lg p-3">
                      <div className="flex-1 space-y-1">
                        <div className="font-medium text-sm">{item.product?.name}</div>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">Р: {item.size}</Badge>
                          <Badge variant="outline" className="text-xs gap-1">
                            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: item.colorHex || '#9ca3af' }} />
                            {item.color}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{item.actualQuantity || item.quantity} шт</Badge>
                        </div>
                        <ItemTimingInfo item={item} />
                      </div>
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white min-h-[36px]"
                        onClick={() => handleIronItem(item.id)}
                        disabled={ironingMutation.isPending}
                      >
                        {ironingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                        Отглажено
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Already ironed items (recently completed) - collapsed */}
      {ironedItems.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            Отглажено (передано на ОТК) — {ironedItems.length} поз.
          </h3>
          <Card className="opacity-80">
            <CardContent className="p-4 max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {ironedItems.slice(0, 20).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                    <div>
                      <span className="font-medium">{item.product?.name}</span>
                      <span className="text-muted-foreground ml-2">Р: {item.size}, {item.color}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{item.actualQuantity || item.quantity} шт</span>
                      {getItemStatusBadge(item.status)}
                    </div>
                  </div>
                ))}
                {ironedItems.length > 20 && (
                  <div className="text-xs text-muted-foreground text-center py-2">...и ещё {ironedItems.length - 20} позиций</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
