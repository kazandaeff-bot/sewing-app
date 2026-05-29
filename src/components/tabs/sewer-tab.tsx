'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Scissors,
  ClipboardList,
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Eye,
  ShieldCheck,
  Upload,
  Wallet,
  Calculator,
  Clock,
  Heater,
} from 'lucide-react'

import type { Employee, SewingTaskResponse, SewingTaskItemResponse } from '@/types'
import { getPeriodLabel, filterByPeriod } from '@/lib/formatters'
import { getItemStatusBadge } from '@/lib/status-badges'
import { ItemTimingInfo } from '@/components/tabs/item-timing-info'

// ============ TAB 1: ШВЕЯ ============
export function SewerTab({ preselectedEmployeeId }: { preselectedEmployeeId?: string }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(preselectedEmployeeId || '')
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [selectedSewingTask, setSelectedSewingTask] = useState<SewingTaskResponse | null>(null)
  const [completeItems, setCompleteItems] = useState<Array<{ id: string; sendQty: string; actualQuantity: string; fabricDefect: string; defectNote: string }>>([])
  const [isPartialSubmit, setIsPartialSubmit] = useState(false)
  const [salaryPeriod, setSalaryPeriod] = useState<'week' | 'month' | 'all'>('month')
  const [singleItemQcDialogOpen, setSingleItemQcDialogOpen] = useState(false)
  const [selectedSingleItem, setSelectedSingleItem] = useState<{ task: SewingTaskResponse; item: SewingTaskItemResponse } | null>(null)
  const [singleItemActualQty, setSingleItemActualQty] = useState('')
  const [singleItemFabricDefect, setSingleItemFabricDefect] = useState('0')
  const [singleItemDefectNote, setSingleItemDefectNote] = useState('')
  const [inWorkItemsForDialog, setInWorkItemsForDialog] = useState<SewingTaskItemResponse[]>([])

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => fetch('/api/employees').then((r) => r.json()),
  })

  const sewers = employees.filter((e: Employee) => e.role === 'sewer')

  // Fetch SewingTask assignments for this employee
  const { data: sewingTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['sewing-tasks', 'employee', selectedEmployeeId],
    queryFn: () => {
      const params = selectedEmployeeId ? `?employeeId=${selectedEmployeeId}` : ''
      return fetch(`/api/sewing-tasks${params}`).then((r) => r.json())
    },
    enabled: !!selectedEmployeeId,
  })

  const updateSewingTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      fetch(`/api/sewing-tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sewing-tasks'] })
      toast({ title: 'Задание обновлено', description: 'Изменения сохранены' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить задание', variant: 'destructive' })
    },
  })

  const handleStartWork = useCallback(
    (task: any) => {
      updateSewingTaskMutation.mutate({ id: task.id, data: { status: 'in_work' } })
    },
    [updateSewingTaskMutation]
  )

  const handleOpenComplete = useCallback(
    (task: SewingTaskResponse) => {
      setSelectedSewingTask(task)
      const inWorkItems = task.items.filter((item: any) => !item.status || item.status === 'in_work')
      setInWorkItemsForDialog(inWorkItems)
      setCompleteItems(inWorkItems.map((item: SewingTaskItemResponse) => ({
        id: item.id,
        sendQty: String(item.quantity),
        actualQuantity: String(item.quantity),
        fabricDefect: '0',
        defectNote: '',
      })))
      setIsPartialSubmit(false)
      setCompleteDialogOpen(true)
    },
    []
  )

  const handleComplete = useCallback((partial: boolean) => {
    if (!selectedSewingTask) return

    if (partial) {
      // Partial submission: send only specified quantities via submitToQc
      const submitToQc = completeItems.map(ci => ({
        id: ci.id,
        sendQty: parseInt(ci.sendQty) || 0,
        actualQuantity: parseInt(ci.actualQuantity) || 0,
        fabricDefect: parseInt(ci.fabricDefect) || 0,
        defectNote: ci.defectNote || null,
      })).filter(ci => ci.sendQty > 0)

      if (submitToQc.length === 0) {
        toast({ title: 'Ошибка', description: 'Укажите количество для отправки', variant: 'destructive' })
        return
      }

      // Validate sendQty <= quantity
      const invalidItem = submitToQc.find(ci => {
        const originalItem = selectedSewingTask.items.find(i => i.id === ci.id)
        return originalItem && ci.sendQty > originalItem.quantity
      })
      if (invalidItem) {
        toast({ title: 'Ошибка', description: 'Количество для отправки превышает плановое', variant: 'destructive' })
        return
      }

      updateSewingTaskMutation.mutate({
        id: selectedSewingTask.id,
        data: { submitToQc },
      })
    } else {
      // Full submission: send all items, set task to pending_qc
      updateSewingTaskMutation.mutate({
        id: selectedSewingTask.id,
        data: {
          status: 'pending_ironing',
          items: completeItems.map(ci => ({
            id: ci.id,
            actualQuantity: parseInt(ci.actualQuantity) || 0,
            fabricDefect: parseInt(ci.fabricDefect) || 0,
            defectNote: ci.defectNote || null,
          })),
        },
      })
    }
    setCompleteDialogOpen(false)
  }, [selectedSewingTask, completeItems, updateSewingTaskMutation, toast])

  const handleOpenSingleItemQc = useCallback(
    (task: SewingTaskResponse, item: SewingTaskItemResponse) => {
      setSelectedSingleItem({ task, item })
      setSingleItemActualQty(String(item.quantity))
      setSingleItemFabricDefect('0')
      setSingleItemDefectNote('')
      setSingleItemQcDialogOpen(true)
    },
    []
  )

  const handleConfirmSingleItemQc = useCallback(() => {
    if (!selectedSingleItem) return
    updateSewingTaskMutation.mutate({
      id: selectedSingleItem.task.id,
      data: {
        items: [{
          id: selectedSingleItem.item.id,
          status: 'pending_ironing',
          actualQuantity: parseInt(singleItemActualQty) || 0,
          fabricDefect: parseInt(singleItemFabricDefect) || 0,
          defectNote: singleItemDefectNote || null,
        }]
      }
    })
    setSingleItemQcDialogOpen(false)
  }, [selectedSingleItem, singleItemActualQty, singleItemFabricDefect, singleItemDefectNote, updateSewingTaskMutation])

  const handleSendAllToQc = useCallback(
    (task: SewingTaskResponse) => {
      updateSewingTaskMutation.mutate({ id: task.id, data: { status: 'pending_ironing' } })
    },
    [updateSewingTaskMutation]
  )

  // Group tasks by status (also handle legacy 'done' status)
  const issuedTasks = sewingTasks.filter((t: any) => t.status === 'issued')
  const inWorkTasks = sewingTasks.filter((t: any) => t.status === 'in_work')
  const pendingIroningTasks = sewingTasks.filter((t: any) => t.status === 'pending_ironing')
  const pendingQcTasks = sewingTasks.filter((t: any) => t.status === 'pending_qc')
  const completedTasks = sewingTasks.filter((t: any) => t.status === 'completed' || t.status === 'done')

  // Salary calculation for completed tasks
  const filteredCompleted = completedTasks.filter((t: any) => {
    return filterByPeriod(t.updatedAt, salaryPeriod)
  })

  // Flatten items from completed tasks for salary calc
  const allCompletedItems = filteredCompleted.flatMap((t: any) =>
    t.items.map((item: any) => ({
      ...item,
      taskUpdatedAt: t.updatedAt,
    }))
  )
  const totalAcceptedUnits = allCompletedItems.reduce((sum: number, item: any) => sum + (item.actualQuantity || item.quantity), 0)
  const totalFabricDefects = allCompletedItems.reduce((sum: number, item: any) => sum + (item.fabricDefect || 0), 0)
  const mainSalary = allCompletedItems.reduce((sum: number, item: any) => {
    return sum + (item.actualQuantity || item.quantity) * (item.product?.sewerRate || 150)
  }, 0)
  const totalSalary = mainSalary
  const periodLabel = getPeriodLabel(salaryPeriod)

  if (employeesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <span className="ml-2 text-muted-foreground">Загрузка...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!preselectedEmployeeId && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <Label htmlFor="sewer-select" className="text-sm font-medium whitespace-nowrap">
            Выберите швею:
          </Label>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger id="sewer-select" className="w-full sm:w-72">
              <SelectValue placeholder="-- Выберите швею --" />
            </SelectTrigger>
            <SelectContent>
              {sewers.map((s: Employee) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!selectedEmployeeId && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Scissors className="h-12 w-12 mb-3 opacity-30" />
            <p>Выберите швею для просмотра заданий</p>
          </CardContent>
        </Card>
      )}

      {selectedEmployeeId && tasksLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <span className="ml-2 text-muted-foreground">Загрузка заданий...</span>
        </div>
      )}

      {selectedEmployeeId && !tasksLoading && (
        <>
          {/* Зарплата швеи */}
          <Card className="border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-lg text-emerald-700">Расчёт зарплаты {periodLabel}</CardTitle>
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
                  <div className="text-xs text-muted-foreground mb-1">Принято ОТК</div>
                  <div className="text-2xl font-bold text-emerald-700">{totalAcceptedUnits} шт</div>
                </div>
                <div className="text-center p-3 bg-white/70 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Тканевый брак</div>
                  <div className="text-2xl font-bold text-red-600">{totalFabricDefects} шт</div>
                </div>
                <div className="text-center p-3 bg-emerald-100 rounded-lg border-2 border-emerald-300 col-span-2 sm:col-span-1">
                  <div className="text-xs text-emerald-700 mb-1 font-medium">Итого зарплата</div>
                  <div className="text-2xl font-bold text-emerald-800">{totalSalary.toLocaleString('ru-RU')} ₽</div>
                </div>
              </div>
              {/* Расшифровка по изделиям */}
              {allCompletedItems.length > 0 && (
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Calculator className="h-3 w-3" /> Расшифровка по изделиям
                  </div>
                  <div className="space-y-1">
                    {(() => {
                      const byProduct: Record<string, { name: string; units: number; rate: number }> = {}
                      allCompletedItems.forEach((item: any) => {
                        const key = item.productId
                        if (!byProduct[key]) byProduct[key] = { name: item.product?.name || 'Изделие', units: 0, rate: item.product?.sewerRate || 150 }
                        byProduct[key].units += (item.actualQuantity || item.quantity)
                      })
                      return Object.values(byProduct).map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-emerald-100 last:border-0">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground">
                            {p.units} шт x {p.rate} ₽ = <span className="font-semibold text-emerald-700">{(p.units * p.rate).toLocaleString('ru-RU')} ₽</span>
                          </span>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Среднее время выполнения */}
          {completedTasks.length > 0 && (
            <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-teal-600" />
                  <CardTitle className="text-lg text-teal-700">Среднее время выполнения</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {(() => {
                    const byTask: Record<string, { name: string; items: Array<{ startedAt: string | null; completedAt: string | null }> }> = {}
                    completedTasks.forEach((t: any) => {
                      const key = t.cuttingPlan?.plan?.name || t.id
                      if (!byTask[key]) byTask[key] = { name: key, items: [] }
                      t.items.forEach((item: any) => {
                        byTask[key].items.push({ startedAt: item.startedAt, completedAt: item.completedAt })
                      })
                    })
                    return Object.values(byTask).map((group, i) => {
                      const timed = group.items.filter(it => it.startedAt && it.completedAt)
                      if (timed.length === 0) return null
                      const avgMs = timed.reduce((sum, it) => sum + (new Date(it.completedAt!).getTime() - new Date(it.startedAt!).getTime()), 0) / timed.length
                      const avgMin = Math.round(avgMs / 60000)
                      const avgHours = Math.floor(avgMin / 60)
                      const avgMins = avgMin % 60
                      return (
                        <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-teal-100 last:border-0">
                          <span className="font-medium">{group.name}</span>
                          <span className="text-teal-700 font-semibold">{avgHours > 0 ? `${avgHours}ч ` : ''}{avgMins}мин</span>
                        </div>
                      )
                    })
                  })()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Выданные задания (issued) */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-500" />
              Новые задания ({issuedTasks.length})
            </h3>
            {issuedTasks.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Нет новых заданий
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {issuedTasks.map((task: any) => (
                  <Card key={task.id} className="border-blue-200 hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">Задание #{task.id.slice(-6)}</CardTitle>
                          <CardDescription className="text-xs">
                            {task.cuttingPlan?.plan?.name || 'План раскроя'}
                          </CardDescription>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">Выдано</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {task.items.map((item: any) => (
                        <div key={item.id} className="text-sm space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">{item.product?.name}</div>
                            {getItemStatusBadge(item.status || 'issued')}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs">Р: {item.size}</Badge>
                            <Badge variant="outline" className="text-xs gap-1">
                              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: item.colorHex || '#9ca3af' }} />
                              {item.color}
                            </Badge>
                          </div>
                          <div><span className="text-muted-foreground">Кол-во:</span> <span className="font-semibold">{item.quantity} шт</span></div>
                          <ItemTimingInfo item={item} />
                        </div>
                      ))}
                      <Button
                        size="sm"
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white min-h-[44px]"
                        onClick={() => handleStartWork(task)}
                        disabled={updateSewingTaskMutation.isPending}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Приступить к работе
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* В работе (in_work) */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Play className="h-5 w-5 text-amber-500" />
              В работе ({inWorkTasks.length})
            </h3>
            {inWorkTasks.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Нет заданий в работе
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {inWorkTasks.map((task: any) => (
                  <Card key={task.id} className="border-amber-200 hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">Задание #{task.id.slice(-6)}</CardTitle>
                          <CardDescription className="text-xs">
                            {task.cuttingPlan?.plan?.name || 'План раскроя'}
                          </CardDescription>
                        </div>
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">В работе</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {task.items.map((item: any) => (
                        <div key={item.id} className="text-sm space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">{item.product?.name}</div>
                            {getItemStatusBadge(item.status || 'in_work')}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs">Р: {item.size}</Badge>
                            <Badge variant="outline" className="text-xs gap-1">
                              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: item.colorHex || '#9ca3af' }} />
                              {item.color}
                            </Badge>
                          </div>
                          <div><span className="text-muted-foreground">Кол-во:</span> <span className="font-semibold">{item.quantity} шт</span></div>
                          <ItemTimingInfo item={item} />
                          {(item.status === 'in_work' || !item.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full text-purple-700 border-purple-300 hover:bg-purple-50 min-h-[36px]"
                              onClick={() => handleOpenSingleItemQc(task, item)}
                              disabled={updateSewingTaskMutation.isPending}
                            >
                              <Upload className="h-3 w-3 mr-1" />
                              На ВТО
                            </Button>
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
                          onClick={() => handleOpenComplete(task)}
                          disabled={updateSewingTaskMutation.isPending || !task.items.some((i: any) => !i.status || i.status === 'in_work')}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Отшить
                        </Button>
                        {task.items.some((i: any) => !i.status || i.status === 'in_work') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-purple-400 text-purple-700 hover:bg-purple-50 min-h-[44px]"
                            onClick={() => handleSendAllToQc(task)}
                            disabled={updateSewingTaskMutation.isPending}
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Все на ВТО
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* На ВТО / проверке ОТК (pending_ironing / pending_qc) */}
          {(pendingIroningTasks.length > 0 || pendingQcTasks.length > 0) && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Heater className="h-5 w-5 text-purple-500" />
                На ВТО / ОТК ({pendingIroningTasks.length + pendingQcTasks.length})
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...pendingIroningTasks, ...pendingQcTasks].map((task: any) => (
                  <Card key={task.id} className="border-purple-200 bg-purple-50/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">Задание #{task.id.slice(-6)}</CardTitle>
                          <CardDescription className="text-xs">
                            {task.cuttingPlan?.plan?.name || 'План раскроя'}
                          </CardDescription>
                        </div>
                        {task.status === 'pending_ironing' ? (
                          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs">На ВТО</Badge>
                        ) : (
                          <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 text-xs">На ОТК</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {task.items.map((item: any) => (
                        <div key={item.id} className="text-sm space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">{item.product?.name}</div>
                            {getItemStatusBadge(item.status || 'pending_ironing')}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs">Р: {item.size}</Badge>
                            <Badge variant="outline" className="text-xs gap-1">
                              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: item.colorHex || '#9ca3af' }} />
                              {item.color}
                            </Badge>
                          </div>
                          <div><span className="text-muted-foreground">План:</span> {item.quantity} шт</div>
                          <div><span className="text-muted-foreground">Факт:</span> <span className="font-semibold">{item.actualQuantity ?? '—'} шт</span></div>
                          {(item.fabricDefect > 0) && (
                            <div className="flex items-center gap-1 text-red-600 text-xs">
                              <AlertTriangle className="h-3 w-3" /> Брак: {item.fabricDefect} шт
                            </div>
                          )}
                          <ItemTimingInfo item={item} />
                        </div>
                      ))}
                      <div className="text-xs text-purple-600 font-medium pt-1">
                        {task.status === 'pending_ironing' ? 'Ожидает утюжки (ВТО)...' : 'Ожидает проверки ОТК...'}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Принято ОТК (completed) */}
          {completedTasks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                Принято ОТК ({completedTasks.length})
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completedTasks.map((task: any) => (
                  <Card key={task.id} className="opacity-80">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">Задание #{task.id.slice(-6)}</CardTitle>
                          <CardDescription className="text-xs">
                            {task.cuttingPlan?.plan?.name || 'План раскроя'}
                          </CardDescription>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">Принято</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {task.items.map((item: any) => (
                        <div key={item.id} className="text-sm space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">{item.product?.name}</div>
                            {getItemStatusBadge(item.status || 'completed')}
                          </div>
                          <div><span className="text-muted-foreground">План:</span> {item.quantity} | <span className="text-muted-foreground">Факт:</span> <span className="font-semibold">{item.actualQuantity ?? item.quantity} шт</span></div>
                          {(item.fabricDefect > 0) && (
                            <div className="text-red-600 text-xs">Брак: {item.fabricDefect} шт</div>
                          )}
                          <ItemTimingInfo item={item} />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Single Item QC Dialog */}
      <Dialog open={singleItemQcDialogOpen} onOpenChange={setSingleItemQcDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Отправить на ВТО</DialogTitle>
            <DialogDescription>
              Укажите фактическое количество для позиции
            </DialogDescription>
          </DialogHeader>
          {selectedSingleItem && (
            <div className="space-y-4">
              <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <div className="font-medium text-sm">{selectedSingleItem.item.product?.name} ({selectedSingleItem.item.product?.article})</div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>Р: {selectedSingleItem.item.size}</span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: selectedSingleItem.item.colorHex || '#9ca3af' }} />
                    {selectedSingleItem.item.color}
                  </span>
                  <span>План: {selectedSingleItem.item.quantity} шт</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Фактически отшито</Label>
                  <Input
                    type="number" min="0"
                    value={singleItemActualQty}
                    onChange={(e) => setSingleItemActualQty(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Тканевый брак</Label>
                  <Input
                    type="number" min="0"
                    value={singleItemFabricDefect}
                    onChange={(e) => setSingleItemFabricDefect(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Примечание к браку</Label>
                <Input
                  placeholder="Необязательно"
                  value={singleItemDefectNote}
                  onChange={(e) => setSingleItemDefectNote(e.target.value)}
                />
              </div>
              <div className="bg-sky-50 border border-sky-200 rounded-md p-3 text-sm text-sky-700">
                <Eye className="h-4 w-4 inline mr-1" />
                Изделие будет отправлено на ВТО (утюжку)
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setSingleItemQcDialogOpen(false)}>
                  Отмена
                </Button>
                <Button
                  className="bg-sky-600 hover:bg-sky-700 text-white"
                  onClick={handleConfirmSingleItemQc}
                  disabled={updateSewingTaskMutation.isPending}
                >
                  {updateSewingTaskMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  <Upload className="h-4 w-4 mr-1" />
                  Отправить на ВТО
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Task Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Завершить пошив</DialogTitle>
            <DialogDescription>
              Укажите фактическое количество по каждой позиции
            </DialogDescription>
          </DialogHeader>
          {selectedSewingTask && (
            <div className="space-y-4">
              {/* Toggle partial mode */}
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium">Режим отправки:</Label>
                <Button
                  size="sm"
                  variant={isPartialSubmit ? 'outline' : 'default'}
                  className={!isPartialSubmit ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                  onClick={() => setIsPartialSubmit(false)}
                >
                  Всё сразу
                </Button>
                <Button
                  size="sm"
                  variant={isPartialSubmit ? 'default' : 'outline'}
                  className={isPartialSubmit ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
                  onClick={() => setIsPartialSubmit(true)}
                >
                  Частями
                </Button>
              </div>

              {isPartialSubmit && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-700">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Укажите количество для отправки на ОТК. Оставшиеся изделия останутся в работе.
                </div>
              )}

              {inWorkItemsForDialog.map((item: SewingTaskItemResponse, idx: number) => (
                <div key={item.id} className="border rounded-lg p-3 space-y-2">
                  <div className="font-medium text-sm">{item.product?.name} ({item.product?.article})</div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>Р: {item.size}</span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: item.colorHex || '#9ca3af' }} />
                      {item.color}
                    </span>
                    <span>План: {item.quantity} шт</span>
                  </div>

                  {isPartialSubmit && (
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-amber-700">Отправить на ОТК</Label>
                      <Input
                        type="number" min="0" max={item.quantity}
                        value={completeItems[idx]?.sendQty || '0'}
                        onChange={(e) => {
                          const val = e.target.value
                          setCompleteItems(prev => prev.map((ci, i) => {
                            if (i !== idx) return ci
                            const sendQty = parseInt(val) || 0
                            return { ...ci, sendQty: val, actualQuantity: val, fabricDefect: sendQty > 0 ? ci.fabricDefect : '0' }
                          }))
                        }}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Фактически отшито</Label>
                      <Input
                        type="number" min="0"
                        value={completeItems[idx]?.actualQuantity || ''}
                        onChange={(e) => {
                          setCompleteItems(prev => prev.map((ci, i) => i === idx ? { ...ci, actualQuantity: e.target.value } : ci))
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Тканевый брак</Label>
                      <Input
                        type="number" min="0"
                        value={completeItems[idx]?.fabricDefect || '0'}
                        onChange={(e) => {
                          setCompleteItems(prev => prev.map((ci, i) => i === idx ? { ...ci, fabricDefect: e.target.value } : ci))
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Примечание к браку</Label>
                    <Input
                      placeholder="Необязательно"
                      value={completeItems[idx]?.defectNote || ''}
                      onChange={(e) => {
                        setCompleteItems(prev => prev.map((ci, i) => i === idx ? { ...ci, defectNote: e.target.value } : ci))
                      }}
                    />
                  </div>
                </div>
              ))}
              {!isPartialSubmit && (
                <div className="bg-sky-50 border border-sky-200 rounded-md p-3 text-sm text-sky-700">
                  <Eye className="h-4 w-4 inline mr-1" />
                  Все изделия будут отправлены на проверку ОТК
                </div>
              )}
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
                  Отмена
                </Button>
                {isPartialSubmit ? (
                  <Button
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => handleComplete(true)}
                    disabled={updateSewingTaskMutation.isPending}
                  >
                    {updateSewingTaskMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    <Upload className="h-4 w-4 mr-1" />
                    Отправить часть на проверку
                  </Button>
                ) : (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleComplete(false)}
                    disabled={updateSewingTaskMutation.isPending}
                  >
                    {updateSewingTaskMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Отшить всё и отправить на проверку
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
