'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  ClipboardCheck,
  Eye,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Wallet,
  Calculator,
} from 'lucide-react'

import type { Product, ReworkReason, SewingTaskResponse, SewingTaskItemResponse, SewingReworkResponse } from '@/types'
import { filterByPeriod, getPeriodLabel } from '@/lib/formatters'
import { getColorDot, getStatusBadge, getReworkStatusBadge } from '@/lib/status-badges'
import { ItemTimingInfo } from '@/components/tabs/item-timing-info'

// Item-level status badge for QC view
function getQcItemStatusBadge(status: string) {
  switch (status) {
    case 'pending_qc':
      return <Badge variant="secondary" className="bg-sky-100 text-sky-700 hover:bg-sky-100 text-xs">На ОТК</Badge>
    case 'completed':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">Принято</Badge>
    case 'in_work':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">В работе</Badge>
    case 'pending_ironing':
      return <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs">На ВТО</Badge>
    case 'ironed':
      return <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-xs">Отглажено</Badge>
    case 'issued':
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100 text-xs">Выдано</Badge>
    default:
      return <Badge variant="secondary" className="text-xs">{status}</Badge>
  }
}

// ============ TAB 2: ОТК ============
export function QCTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [reworkDialogOpen, setReworkDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<SewingTaskResponse | null>(null)
  const [selectedItemForRework, setSelectedItemForRework] = useState<SewingTaskItemResponse | null>(null)
  const [reworkQty, setReworkQty] = useState<string>('')
  const [reworkReason, setReworkReason] = useState<string>('')
  const [reworkCustomReason, setReworkCustomReason] = useState<string>('')
  const [reworkStatusFilter, setReworkStatusFilter] = useState<string>('all')
  const [qcSalaryPeriod, setQcSalaryPeriod] = useState<'week' | 'month' | 'all'>('month')

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then((r) => r.json()),
  })

  // Fetch ALL sewing tasks to support item-level status filtering
  const { data: allSewingTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['sewing-tasks', 'qc-all'],
    queryFn: () => fetch('/api/sewing-tasks').then((r) => r.json()),
  })

  const { data: reworks = [], isLoading: reworksLoading } = useQuery({
    queryKey: ['sewing-reworks', reworkStatusFilter],
    queryFn: () => {
      const params = reworkStatusFilter !== 'all' ? `?status=${reworkStatusFilter}` : ''
      return fetch(`/api/sewing-reworks${params}`).then((r) => r.json())
    },
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      fetch(`/api/sewing-tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sewing-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['sewing-reworks'] })
      toast({ title: 'Статус обновлён', description: 'Изменения сохранены' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить задание', variant: 'destructive' })
    },
  })

  const createReworkMutation = useMutation({
    mutationFn: (data: { sewingTaskItemId: string; sewingTaskId: string; quantity: number; reason: string }) =>
      fetch('/api/sewing-reworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sewing-reworks'] })
      queryClient.invalidateQueries({ queryKey: ['sewing-tasks'] })
      setReworkDialogOpen(false)
      toast({ title: 'Переделка создана', description: 'Изделие возвращено швее на переделку' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось создать переделку', variant: 'destructive' })
    },
  })

  const updateReworkMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/sewing-reworks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sewing-reworks'] })
      queryClient.invalidateQueries({ queryKey: ['sewing-tasks'] })
      toast({ title: 'Статус обновлён', description: 'Статус переделки изменён' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить статус', variant: 'destructive' })
    },
  })

  // Accept a single item — mark it as completed via items API
  const handleAcceptItem = useCallback(
    (task: SewingTaskResponse, item: SewingTaskItemResponse) => {
      updateTaskMutation.mutate({
        id: task.id,
        data: {
          items: [{ id: item.id, status: 'completed' }],
        },
      })
    },
    [updateTaskMutation]
  )

  // Accept all pending_qc items in a task at once
  const handleAcceptAllItems = useCallback(
    (task: SewingTaskResponse) => {
      const pendingQcItems = task.items.filter((i: SewingTaskItemResponse) => i.status === 'pending_qc')
      if (pendingQcItems.length === 0) return
      updateTaskMutation.mutate({
        id: task.id,
        data: {
          items: pendingQcItems.map((i: SewingTaskItemResponse) => ({ id: i.id, status: 'completed' })),
        },
      })
    },
    [updateTaskMutation]
  )

  const handleOpenRework = useCallback((task: SewingTaskResponse, item: SewingTaskItemResponse) => {
    setSelectedTask(task)
    setSelectedItemForRework(item)
    setReworkQty('')
    setReworkReason('')
    setReworkCustomReason('')
    setReworkDialogOpen(true)
  }, [])

  const handleCreateRework = useCallback(() => {
    if (!selectedTask || !selectedItemForRework || !reworkQty) return
    const reason = reworkReason === '__custom__' ? reworkCustomReason : reworkReason
    if (!reason) return
    createReworkMutation.mutate({
      sewingTaskItemId: selectedItemForRework.id,
      sewingTaskId: selectedTask.id,
      quantity: parseInt(reworkQty),
      reason,
    })
  }, [selectedTask, selectedItemForRework, reworkQty, reworkReason, reworkCustomReason, createReworkMutation])

  // ============ Item-level groupings ============
  // Tasks that have at least one item with pending_qc status
  const tasksWithPendingQcItems = allSewingTasks.filter((task: SewingTaskResponse) =>
    task.items.some((item: SewingTaskItemResponse) => item.status === 'pending_qc')
  )

  // Pending_qc items grouped by task (for display)
  const pendingQcItemsGrouped = tasksWithPendingQcItems.map((task: SewingTaskResponse) => ({
    task,
    items: task.items.filter((item: SewingTaskItemResponse) => item.status === 'pending_qc'),
  }))

  const totalPendingQcItems = pendingQcItemsGrouped.reduce((sum, g) => sum + g.items.length, 0)

  // Tasks that have at least one item with completed status
  const tasksWithCompletedItems = allSewingTasks.filter((task: SewingTaskResponse) =>
    task.items.some((item: SewingTaskItemResponse) => item.status === 'completed')
  )

  // Completed items grouped by task (for display)
  const completedItemsGrouped = tasksWithCompletedItems.map((task: SewingTaskResponse) => ({
    task,
    items: task.items.filter((item: SewingTaskItemResponse) => item.status === 'completed'),
  }))

  const totalCompletedItems = completedItemsGrouped.reduce((sum, g) => sum + g.items.length, 0)

  // Reworks pending_qc (seamstress completed rework, needs QC check)
  const pendingQcReworks = reworks.filter(
    (r: SewingReworkResponse) => r.status === 'pending_qc'
  )

  // Other reworks filtered
  const filteredReworks = reworks.filter(
    (r: SewingReworkResponse) => r.status !== 'pending_qc'
  )

  const getProductReworkReasons = (productId: string): ReworkReason[] => {
    const product = products.find((p: Product) => p.id === productId)
    return product?.reworkReasons || []
  }

  // ============ Расчёт зарплаты ОТК (item-level) ============
  // Flatten items with completed status from all tasks for salary calc
  const qcCompletedItems = allSewingTasks
    .filter((t: SewingTaskResponse) => filterByPeriod(t.updatedAt, qcSalaryPeriod))
    .flatMap((t: SewingTaskResponse) =>
      t.items
        .filter((item: SewingTaskItemResponse) => item.status === 'completed')
        .map((item: SewingTaskItemResponse) => ({
          ...item,
          taskUpdatedAt: t.updatedAt,
        }))
    )

  // Переделки — показываем для информации, но НЕ оплачиваем дополнительно
  // Переделки входят в нормальную нагрузку ОТК (оплата по плану)
  const qcReworksChecked = reworks.filter((r: SewingReworkResponse) => r.status === 'completed' && filterByPeriod(r.updatedAt, qcSalaryPeriod))
  // Количество проверенных единиц (только основные изделия, без переделок)
  const qcTotalUnitsChecked = qcCompletedItems.reduce((sum: number, item: SewingTaskItemResponse) => sum + (item.actualQuantity || item.quantity), 0)
  const qcTotalReworksChecked = qcReworksChecked.reduce((sum: number, r: SewingReworkResponse) => sum + r.quantity, 0)
  // Зарплата: только по принятым изделиям из плана (переделки не оплачиваются дополнительно)
  const qcSalary = qcCompletedItems.reduce((sum: number, item: SewingTaskItemResponse) => {
    return sum + (item.actualQuantity || item.quantity) * (item.product.qcRate || 50)
  }, 0)
  const qcPeriodLabel = getPeriodLabel(qcSalaryPeriod)

  return (
    <div className="space-y-6">
      {/* Зарплата ОТК */}
      <Card className="border-sky-300 bg-gradient-to-br from-sky-50 to-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-sky-600" />
              <CardTitle className="text-lg text-sky-700">Расчёт зарплаты {qcPeriodLabel}</CardTitle>
            </div>
            <Select value={qcSalaryPeriod} onValueChange={(v) => setQcSalaryPeriod(v as 'week' | 'month' | 'all')}>
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
              <div className="text-xs text-muted-foreground mb-1">Принято изделий</div>
              <div className="text-2xl font-bold text-sky-700">{qcTotalUnitsChecked} шт</div>
            </div>
            <div className="text-center p-3 bg-white/70 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Переделок проверено</div>
              <div className="text-2xl font-bold text-purple-700">{qcTotalReworksChecked} шт</div>
              <div className="text-xs text-muted-foreground">(входит в базовую нагрузку)</div>
            </div>
            <div className="text-center p-3 bg-sky-100 rounded-lg border-2 border-sky-300 col-span-2 sm:col-span-1">
              <div className="text-xs text-sky-700 mb-1 font-medium">Итого зарплата</div>
              <div className="text-2xl font-bold text-sky-800">{qcSalary.toLocaleString('ru-RU')} ₽</div>
              <div className="text-xs text-sky-600">по плану, без доплаты за переделки</div>
            </div>
          </div>
          {/* Расшифровка по изделиям */}
          {qcCompletedItems.length > 0 && (
            <div className="bg-white/60 rounded-lg p-3">
              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Calculator className="h-3 w-3" /> Расшифровка по изделиям
              </div>
              <div className="space-y-1">
                {(() => {
                  const byProduct: Record<string, { name: string; units: number; rate: number }> = {}
                  qcCompletedItems.forEach((item: SewingTaskItemResponse) => {
                    const key = item.productId
                    if (!byProduct[key]) byProduct[key] = { name: item.product?.name || 'Изделие', units: 0, rate: item.product?.qcRate || 50 }
                    byProduct[key].units += (item.actualQuantity || item.quantity)
                  })
                  return Object.values(byProduct).map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-sky-100 last:border-0">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground">
                        {p.units} шт x {p.rate} ₽ = <span className="font-semibold text-sky-700">{(p.units * p.rate).toLocaleString('ru-RU')} ₽</span>
                      </span>
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PENDING QC — Items with status === 'pending_qc', grouped by task */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Eye className="h-5 w-5 text-sky-500" />
          На проверке ({totalPendingQcItems})
        </h3>
        {tasksLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : totalPendingQcItems === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              Нет изделий, ожидающих проверки
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingQcItemsGrouped.map(({ task, items }) => (
              <Card key={task.id} className="border-sky-200 bg-sky-50/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">Задание #{task.id.slice(-6)}</CardTitle>
                      <CardDescription className="text-xs">
                        {task.cuttingPlan?.plan?.name || 'План раскроя'}
                      </CardDescription>
                    </div>
                    {getStatusBadge(task.status)}
                  </div>
                  <div className="text-sm mt-1">
                    <span className="text-muted-foreground">Швея:</span>{' '}
                    <span className="font-medium">{task.employee?.name}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map((item: SewingTaskItemResponse) => (
                    <div key={item.id} className="text-sm space-y-1 border-b border-sky-100 last:border-0 pb-2 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{item.product?.name} <span className="text-muted-foreground text-xs">({item.product?.article})</span></div>
                        {getQcItemStatusBadge(item.status)}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">Р: {item.size}</Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          {getColorDot(item.colorHex)}
                          {item.color}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-xs text-muted-foreground">План</div>
                          <div className="font-semibold">{item.quantity}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Факт</div>
                          <div className="font-semibold">{item.actualQuantity ?? '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Брак</div>
                          <div className={`font-semibold ${item.fabricDefect > 0 ? 'text-red-600' : ''}`}>
                            {item.fabricDefect}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[36px] text-xs"
                          onClick={() => handleAcceptItem(task, item)}
                          disabled={updateTaskMutation.isPending}
                        >
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Принять
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-orange-400 text-orange-700 hover:bg-orange-50 min-h-[36px] text-xs"
                          onClick={() => handleOpenRework(task, item)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          На переделку
                        </Button>
                      </div>
                      <ItemTimingInfo item={item} />
                    </div>
                  ))}
                  {items.length > 1 && (
                    <Button
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
                      onClick={() => handleAcceptAllItems(task)}
                      disabled={updateTaskMutation.isPending}
                    >
                      <ShieldCheck className="h-4 w-4 mr-1" />
                      Принять все ({items.length})
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* REWORKS pending_qc — seamstress completed rework, QC needs to check */}
      {pendingQcReworks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-purple-500" />
            Переделки на проверке ({pendingQcReworks.length})
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingQcReworks.map((rework: SewingReworkResponse) => (
              <Card key={rework.id} className="border-purple-200 bg-purple-50/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">
                      {rework.sewingTaskItem?.product?.name || 'Изделие'}
                    </CardTitle>
                    {getReworkStatusBadge(rework.status)}
                  </div>
                  <CardDescription className="text-xs">
                    Размер {rework.sewingTaskItem?.size} · {rework.sewingTaskItem?.color} · Швея: {rework.sewingTask?.employee?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Причина:</span> {rework.reason}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Количество:</span>{' '}
                    <span className="font-semibold">{rework.quantity} шт</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
                      onClick={() =>
                        updateReworkMutation.mutate({ id: rework.id, status: 'completed' })
                      }
                      disabled={updateReworkMutation.isPending}
                    >
                      <ShieldCheck className="h-4 w-4 mr-1" />
                      Принять
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ACCEPTED — Items with status === 'completed', grouped by task */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          Принято ОТК ({totalCompletedItems})
        </h3>
        {tasksLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : totalCompletedItems === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              Нет принятых изделий
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completedItemsGrouped.map(({ task, items }) => (
              <Card key={task.id} className="opacity-80">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">Задание #{task.id.slice(-6)}</CardTitle>
                      <CardDescription className="text-xs">
                        {task.cuttingPlan?.plan?.name || 'План раскроя'}
                      </CardDescription>
                    </div>
                    {getStatusBadge(task.status)}
                  </div>
                  <div className="text-sm mt-1">
                    <span className="text-muted-foreground">Швея:</span>{' '}
                    <span className="font-medium">{task.employee?.name}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.map((item: SewingTaskItemResponse) => (
                    <div key={item.id} className="text-sm space-y-1 border-b last:border-0 pb-2 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{item.product?.name}</div>
                        {getQcItemStatusBadge(item.status)}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">Р: {item.size}</Badge>
                        <Badge variant="outline" className="text-xs gap-1">
                          {getColorDot(item.colorHex)}
                          {item.color}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-xs text-muted-foreground">План</div>
                          <div className="font-semibold">{item.quantity}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Факт</div>
                          <div className="font-semibold">{item.actualQuantity ?? item.quantity}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Брак</div>
                          <div className={`font-semibold ${item.fabricDefect > 0 ? 'text-red-600' : ''}`}>
                            {item.fabricDefect}
                          </div>
                        </div>
                      </div>
                      {item.reworks.length > 0 && (
                        <div className="flex items-center gap-1 text-orange-600 text-xs">
                          <RotateCcw className="h-3 w-3" />
                          Переделок: {item.reworks.length}
                        </div>
                      )}
                      <ItemTimingInfo item={item} />
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-orange-400 text-orange-700 hover:bg-orange-50 min-h-[36px] text-xs"
                        onClick={() => handleOpenRework(task, item)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        На переделку
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Other Reworks Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-orange-500" />
            Переделки
          </h3>
          <Select value={reworkStatusFilter} onValueChange={setReworkStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все</SelectItem>
              <SelectItem value="pending">Ожидает</SelectItem>
              <SelectItem value="in_progress">В работе</SelectItem>
              <SelectItem value="completed">Завершено</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {reworksLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : filteredReworks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              Нет переделок
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredReworks.map((rework: SewingReworkResponse) => (
              <Card key={rework.id} className="border-orange-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">
                      {rework.sewingTaskItem?.product?.name || 'Изделие'}
                    </CardTitle>
                    {getReworkStatusBadge(rework.status)}
                  </div>
                  <CardDescription className="text-xs">
                    Размер {rework.sewingTaskItem?.size} · {rework.sewingTaskItem?.color} · Швея: {rework.sewingTask?.employee?.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Причина:</span> {rework.reason}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Количество:</span>{' '}
                    <span className="font-semibold">{rework.quantity} шт</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Rework Dialog */}
      <Dialog open={reworkDialogOpen} onOpenChange={setReworkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Отправить на переделку</DialogTitle>
            <DialogDescription>
              Укажите причину и количество изделий для переделки
            </DialogDescription>
          </DialogHeader>
          {selectedTask && selectedItemForRework && (
            <div className="space-y-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Изделие:</span>{' '}
                <span className="font-medium">{selectedItemForRework.product?.name} ({selectedItemForRework.product?.article})</span>
              </div>
              <div className="text-sm flex gap-2">
                <span>
                  <span className="text-muted-foreground">Размер:</span>{' '}
                  <span className="font-medium">{selectedItemForRework.size}</span>
                </span>
                <span className="flex items-center gap-1">
                  {getColorDot(selectedItemForRework.colorHex)}
                  <span className="font-medium">{selectedItemForRework.color}</span>
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Швея:</span>{' '}
                <span className="font-medium">{selectedTask.employee?.name}</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reworkQty">Количество на переделку</Label>
                <Input
                  id="reworkQty"
                  type="number"
                  min="1"
                  max={selectedItemForRework.actualQuantity || selectedItemForRework.quantity}
                  value={reworkQty}
                  onChange={(e) => setReworkQty(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Причина переделки</Label>
                <Select value={reworkReason} onValueChange={setReworkReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Выберите причину --" />
                  </SelectTrigger>
                  <SelectContent>
                    {getProductReworkReasons(selectedItemForRework.productId).map((r: ReworkReason) => (
                      <SelectItem key={r.id} value={r.text}>
                        {r.text}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">Другая причина...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {reworkReason === '__custom__' && (
                <div className="space-y-2">
                  <Label htmlFor="customReason">Опишите причину</Label>
                  <Textarea
                    id="customReason"
                    placeholder="Опишите причину переделки"
                    value={reworkCustomReason}
                    onChange={(e) => setReworkCustomReason(e.target.value)}
                  />
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setReworkDialogOpen(false)}>
                  Отмена
                </Button>
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={handleCreateRework}
                  disabled={createReworkMutation.isPending || !reworkQty || (!reworkReason || (reworkReason === '__custom__' && !reworkCustomReason))}
                >
                  {createReworkMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Отправить на переделку
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
