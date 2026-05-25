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
  ShieldCheck,
  RotateCcw,
  Loader2,
  Wallet,
  Calculator,
} from 'lucide-react'
import { type Employee, type TaskWithRelations, type Rework, type Product, type ReworkReason } from '@/types'
import { getColorDot, getStatusBadge, getReworkStatusBadge } from '@/lib/helpers'

export function QCTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [reworkDialogOpen, setReworkDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const [reworkQty, setReworkQty] = useState<string>('')
  const [reworkReason, setReworkReason] = useState<string>('')
  const [reworkCustomReason, setReworkCustomReason] = useState<string>('')
  const [reworkStatusFilter, setReworkStatusFilter] = useState<string>('all')
  const [qcSalaryPeriod, setQcSalaryPeriod] = useState<'week' | 'month' | 'all'>('month')

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then((r) => r.json()),
  })

  const { data: pendingQcTasks = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['tasks', 'status', 'pending_qc'],
    queryFn: () => fetch('/api/tasks?status=pending_qc').then((r) => r.json()),
  })

  const { data: completedTasks = [], isLoading: completedLoading } = useQuery({
    queryKey: ['tasks', 'status', 'completed'],
    queryFn: () => fetch('/api/tasks?status=completed').then((r) => r.json()),
  })

  const { data: reworks = [], isLoading: reworksLoading } = useQuery({
    queryKey: ['reworks', reworkStatusFilter],
    queryFn: () => {
      const params = reworkStatusFilter !== 'all' ? `?status=${reworkStatusFilter}` : ''
      return fetch(`/api/reworks${params}`).then((r) => r.json())
    },
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['reworks'] })
      toast({ title: 'Задание принято', description: 'Изделие прошло проверку ОТК' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить задание', variant: 'destructive' })
    },
  })

  const createReworkMutation = useMutation({
    mutationFn: (data: { taskId: string; quantity: number; reason: string }) =>
      fetch('/api/reworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reworks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setReworkDialogOpen(false)
      toast({ title: 'Переделка создана', description: 'Изделие возвращено швее на переделку' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось создать переделку', variant: 'destructive' })
    },
  })

  const updateReworkMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/reworks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reworks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast({ title: 'Статус обновлён', description: 'Статус переделки изменён' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить статус', variant: 'destructive' })
    },
  })

  const handleAccept = useCallback(
    (task: TaskWithRelations) => {
      updateTaskMutation.mutate({ id: task.id, data: { status: 'completed' } })
    },
    [updateTaskMutation]
  )

  const handleOpenRework = useCallback((task: TaskWithRelations) => {
    setSelectedTask(task)
    setReworkQty('')
    setReworkReason('')
    setReworkCustomReason('')
    setReworkDialogOpen(true)
  }, [])

  const handleCreateRework = useCallback(() => {
    if (!selectedTask || !reworkQty) return
    const reason = reworkReason === '__custom__' ? reworkCustomReason : reworkReason
    if (!reason) return
    createReworkMutation.mutate({
      taskId: selectedTask.id,
      quantity: parseInt(reworkQty),
      reason,
    })
  }, [selectedTask, reworkQty, reworkReason, reworkCustomReason, createReworkMutation])

  // Reworks pending_qc (seamstress completed rework, needs QC check)
  const pendingQcReworks = reworks.filter(
    (r: Rework & { task?: TaskWithRelations }) => r.status === 'pending_qc'
  )

  // Other reworks filtered
  const filteredReworks = reworks.filter(
    (r: Rework & { task?: TaskWithRelations }) => r.status !== 'pending_qc'
  )

  const getProductReworkReasons = (productId: string): ReworkReason[] => {
    const product = products.find((p: Product) => p.id === productId)
    return product?.reworkReasons || []
  }

  // ============ Расчёт зарплаты ОТК ============
  const qcNow = new Date()
  const filterByPeriod = (dateStr: string | null): boolean => {
    if (qcSalaryPeriod === 'all') return true
    if (!dateStr) return false
    const diffDays = (qcNow.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
    return qcSalaryPeriod === 'week' ? diffDays <= 7 : diffDays <= 30
  }
  // Принятые ОТК задания — это completed tasks (ОТК нажал "Принять")
  const qcAcceptedFiltered = completedTasks.filter((t: TaskWithRelations) => filterByPeriod(t.completedAt))
  // Переделки, проверенные ОТК (status = completed, одобрено ОТК)
  const qcReworksChecked = reworks.filter((r: Rework & { task?: TaskWithRelations }) => r.status === 'completed' && filterByPeriod(r.updatedAt))
  // Количество проверенных единиц
  const qcTotalUnitsChecked = qcAcceptedFiltered.reduce((sum: number, t: TaskWithRelations) => sum + (t.actualQuantity || 0), 0)
  const qcTotalReworksChecked = qcReworksChecked.reduce((sum: number, r: Rework & { task?: TaskWithRelations }) => sum + r.quantity, 0)
  const qcTotalInspected = qcTotalUnitsChecked + qcTotalReworksChecked
  // Зарплата с учётом ставок по каждому изделию
  const qcSalaryMain = qcAcceptedFiltered.reduce((sum: number, t: TaskWithRelations) => {
    return sum + (t.actualQuantity || 0) * (t.product.qcRate || 50)
  }, 0)
  const qcSalaryReworks = qcReworksChecked.reduce((sum: number, r: Rework & { task?: TaskWithRelations }) => {
    return sum + r.quantity * (r.task?.product?.qcRate || 50)
  }, 0)
  const qcSalary = qcSalaryMain + qcSalaryReworks
  const qcPeriodLabel = qcSalaryPeriod === 'week' ? 'за неделю' : qcSalaryPeriod === 'month' ? 'за месяц' : 'за всё время'

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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-white/70 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Принято изделий</div>
              <div className="text-2xl font-bold text-sky-700">{qcTotalUnitsChecked} шт</div>
            </div>
            <div className="text-center p-3 bg-white/70 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Переделок проверено</div>
              <div className="text-2xl font-bold text-purple-700">{qcTotalReworksChecked} шт</div>
            </div>
            <div className="text-center p-3 bg-white/70 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Всего проверено</div>
              <div className="text-2xl font-bold text-blue-700">{qcTotalInspected} шт</div>
            </div>
            <div className="text-center p-3 bg-sky-100 rounded-lg border-2 border-sky-300">
              <div className="text-xs text-sky-700 mb-1 font-medium">Итого зарплата</div>
              <div className="text-2xl font-bold text-sky-800">{qcSalary.toLocaleString('ru-RU')} ₽</div>
              <div className="text-xs text-sky-600">
                {qcSalaryMain.toLocaleString('ru-RU')} + {qcSalaryReworks.toLocaleString('ru-RU')}
              </div>
            </div>
          </div>
          {/* Расшифровка по изделиям */}
          {qcAcceptedFiltered.length > 0 && (
            <div className="bg-white/60 rounded-lg p-3">
              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Calculator className="h-3 w-3" /> Расшифровка по изделиям
              </div>
              <div className="space-y-1">
                {(() => {
                  const byProduct: Record<string, { name: string; units: number; rate: number; reworkUnits: number }> = {}
                  qcAcceptedFiltered.forEach((t: TaskWithRelations) => {
                    const key = t.productId
                    if (!byProduct[key]) byProduct[key] = { name: t.product.name, units: 0, rate: t.product.qcRate || 50, reworkUnits: 0 }
                    byProduct[key].units += (t.actualQuantity || 0)
                  })
                  qcReworksChecked.forEach((r: Rework & { task?: TaskWithRelations }) => {
                    if (!r.task) return
                    const key = r.task.productId
                    if (!byProduct[key]) byProduct[key] = { name: r.task.product.name, units: 0, rate: r.task.product.qcRate || 50, reworkUnits: 0 }
                    byProduct[key].reworkUnits += r.quantity
                  })
                  return Object.values(byProduct).map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-sky-100 last:border-0">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted-foreground">
                        {p.units} шт x {p.rate} ₽{p.reworkUnits > 0 ? ` + ${p.reworkUnits} перед. x ${p.rate} ₽` : ''} = <span className="font-semibold text-sky-700">{(p.units * p.rate + p.reworkUnits * p.rate).toLocaleString('ru-RU')} ₽</span>
                      </span>
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PENDING QC — Tasks waiting for initial inspection */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Eye className="h-5 w-5 text-sky-500" />
          На проверке ({pendingQcTasks.length})
        </h3>
        {pendingLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : pendingQcTasks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              Нет изделий, ожидающих проверки
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingQcTasks.map((task: TaskWithRelations) => (
              <Card key={task.id} className="border-sky-200 bg-sky-50/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{task.product.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {task.product.article}
                      </CardDescription>
                    </div>
                    {getStatusBadge(task.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Швея:</span>{' '}
                    <span className="font-medium">{task.employee.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      Размер: {task.size}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getColorDot(task.colorHex)}
                      {task.color}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xs text-muted-foreground">План</div>
                      <div className="font-semibold">{task.quantity}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Факт</div>
                      <div className="font-semibold">{task.actualQuantity}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Брак</div>
                      <div className={`font-semibold ${task.fabricDefect > 0 ? 'text-red-600' : ''}`}>
                        {task.fabricDefect}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
                      onClick={() => handleAccept(task)}
                      disabled={updateTaskMutation.isPending}
                    >
                      <ShieldCheck className="h-4 w-4 mr-1" />
                      Принять
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-orange-400 text-orange-700 hover:bg-orange-50 min-h-[44px]"
                      onClick={() => handleOpenRework(task)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      На переделку
                    </Button>
                  </div>
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
            {pendingQcReworks.map((rework: Rework & { task?: TaskWithRelations }) => (
              <Card key={rework.id} className="border-purple-200 bg-purple-50/30">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">
                      {rework.task?.product?.name || 'Изделие'}
                    </CardTitle>
                    {getReworkStatusBadge(rework.status)}
                  </div>
                  {rework.task && (
                    <CardDescription className="text-xs">
                      {rework.task.product?.article} · Размер {rework.task.size} · {rework.task.employee?.name}
                    </CardDescription>
                  )}
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

      {/* ACCEPTED */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
          Принятые изделия ({completedTasks.length})
        </h3>
        {completedLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        ) : completedTasks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              Нет принятых изделий
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completedTasks.map((task: TaskWithRelations) => (
              <Card key={task.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{task.product.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {task.product.article}
                      </CardDescription>
                    </div>
                    {getStatusBadge(task.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Швея:</span>{' '}
                    <span className="font-medium">{task.employee.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      Размер: {task.size}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {getColorDot(task.colorHex)}
                      {task.color}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-xs text-muted-foreground">План</div>
                      <div className="font-semibold">{task.quantity}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Факт</div>
                      <div className="font-semibold">{task.actualQuantity}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Брак</div>
                      <div className={`font-semibold ${task.fabricDefect > 0 ? 'text-red-600' : ''}`}>
                        {task.fabricDefect}
                      </div>
                    </div>
                  </div>
                  {task.reworks.length > 0 && (
                    <div className="flex items-center gap-1 text-orange-600 text-xs">
                      <RotateCcw className="h-3 w-3" />
                      Переделок: {task.reworks.length}
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-orange-400 text-orange-700 hover:bg-orange-50 min-h-[44px]"
                    onClick={() => handleOpenRework(task)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    На переделку
                  </Button>
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
            {filteredReworks.map((rework: Rework & { task?: TaskWithRelations }) => (
              <Card key={rework.id} className="border-orange-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">
                      {rework.task?.product?.name || 'Изделие'}
                    </CardTitle>
                    {getReworkStatusBadge(rework.status)}
                  </div>
                  {rework.task && (
                    <CardDescription className="text-xs">
                      {rework.task.product?.article} · Размер {rework.task.size} · {rework.task.employee?.name}
                    </CardDescription>
                  )}
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
          {selectedTask && (
            <div className="space-y-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Изделие:</span>{' '}
                <span className="font-medium">{selectedTask.product.name} ({selectedTask.product.article})</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Швея:</span>{' '}
                <span className="font-medium">{selectedTask.employee.name}</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reworkQty">Количество на переделку</Label>
                <Input
                  id="reworkQty"
                  type="number"
                  min="1"
                  max={selectedTask.actualQuantity || selectedTask.quantity}
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
                    {getProductReworkReasons(selectedTask.productId).map((r: ReworkReason) => (
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
