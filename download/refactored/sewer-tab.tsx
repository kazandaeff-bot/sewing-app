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
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import {
  Scissors,
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Eye,
  ShieldCheck,
  Wallet,
  Calculator,
} from 'lucide-react'
import { type Employee, type TaskWithRelations, type Rework, type Product } from '@/types'
import { getColorDot, getStatusBadge, getReworkStatusBadge } from '@/lib/helpers'

export function SewerTab({ preselectedEmployeeId }: { preselectedEmployeeId?: string }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(preselectedEmployeeId || '')
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)
  const [actualQty, setActualQty] = useState<string>('')
  const [fabricDefect, setFabricDefect] = useState<string>('0')
  const [defectNote, setDefectNote] = useState<string>('')
  const [salaryPeriod, setSalaryPeriod] = useState<'week' | 'month' | 'all'>('month')

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => fetch('/api/employees').then((r) => r.json()),
  })

  const sewers = employees.filter((e: Employee) => e.role === 'sewer')

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'employee', selectedEmployeeId],
    queryFn: () => {
      const params = selectedEmployeeId ? `?employeeId=${selectedEmployeeId}` : ''
      return fetch(`/api/tasks${params}`).then((r) => r.json())
    },
    enabled: !!selectedEmployeeId,
  })

  const { data: reworks = [] } = useQuery({
    queryKey: ['reworks'],
    queryFn: () => fetch('/api/reworks').then((r) => r.json()),
    enabled: !!selectedEmployeeId,
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
      toast({ title: 'Задание обновлено', description: 'Изменения сохранены' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить задание', variant: 'destructive' })
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
      toast({ title: 'Переделка обновлена', description: 'Статус изменён' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить переделку', variant: 'destructive' })
    },
  })

  const handleStartWork = useCallback(
    (task: TaskWithRelations) => {
      updateTaskMutation.mutate({ id: task.id, data: { status: 'in_progress' } })
    },
    [updateTaskMutation]
  )

  const handleOpenComplete = useCallback(
    (task: TaskWithRelations) => {
      setSelectedTask(task)
      setActualQty(String(task.quantity))
      setFabricDefect('0')
      setDefectNote('')
      setCompleteDialogOpen(true)
    },
    []
  )

  const handleComplete = useCallback(() => {
    if (!selectedTask) return
    updateTaskMutation.mutate({
      id: selectedTask.id,
      data: {
        status: 'pending_qc',
        actualQuantity: parseInt(actualQty) || 0,
        fabricDefect: parseInt(fabricDefect) || 0,
        defectNote: defectNote || null,
      },
    })
    setCompleteDialogOpen(false)
  }, [selectedTask, actualQty, fabricDefect, defectNote, updateTaskMutation])

  // Filter reworks for this employee
  const employeeReworks = reworks.filter(
    (r: Rework & { task?: TaskWithRelations }) => r.task?.employeeId === selectedEmployeeId
  )

  const activeTasks = tasks.filter((t: TaskWithRelations) => t.status === 'new' || t.status === 'in_progress')
  const pendingQcTasks = tasks.filter((t: TaskWithRelations) => t.status === 'pending_qc')
  const acceptedTasks = tasks.filter((t: TaskWithRelations) => t.status === 'completed')

  // ============ Расчёт зарплаты швеи ============
  const now = new Date()
  const filteredAccepted = acceptedTasks.filter((t: TaskWithRelations) => {
    if (salaryPeriod === 'all') return true
    const completedAt = t.completedAt ? new Date(t.completedAt) : null
    if (!completedAt) return false
    const diffDays = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24)
    return salaryPeriod === 'week' ? diffDays <= 7 : diffDays <= 30
  })
  const filteredReworksCompleted = employeeReworks.filter((r: Rework & { task?: TaskWithRelations }) => {
    if (r.status !== 'completed') return false
    if (salaryPeriod === 'all') return true
    const updatedAt = r.updatedAt ? new Date(r.updatedAt) : null
    if (!updatedAt) return false
    const diffDays = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    return salaryPeriod === 'week' ? diffDays <= 7 : diffDays <= 30
  })
  // Считаем зарплату с учётом ставок по каждому изделию
  const mainSalary = filteredAccepted.reduce((sum: number, t: TaskWithRelations) => {
    return sum + (t.actualQuantity || 0) * (t.product.sewerRate || 150)
  }, 0)
  const reworkSalary = filteredReworksCompleted.reduce((sum: number, r: Rework & { task?: TaskWithRelations }) => {
    return sum + r.quantity * (r.task?.product?.reworkRate || 80)
  }, 0)
  const totalAcceptedUnits = filteredAccepted.reduce((sum: number, t: TaskWithRelations) => sum + (t.actualQuantity || 0), 0)
  const totalReworkUnits = filteredReworksCompleted.reduce((sum: number, r: Rework & { task?: TaskWithRelations }) => sum + r.quantity, 0)
  const totalFabricDefects = filteredAccepted.reduce((sum: number, t: TaskWithRelations) => sum + t.fabricDefect, 0)
  const totalSalary = mainSalary + reworkSalary
  const periodLabel = salaryPeriod === 'week' ? 'за неделю' : salaryPeriod === 'month' ? 'за месяц' : 'за всё время'

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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-white/70 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Принято ОТК</div>
                  <div className="text-2xl font-bold text-emerald-700">{totalAcceptedUnits} шт</div>
                </div>
                <div className="text-center p-3 bg-white/70 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Переделки выполнены</div>
                  <div className="text-2xl font-bold text-amber-700">{totalReworkUnits} шт</div>
                </div>
                <div className="text-center p-3 bg-white/70 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">Тканевый брак</div>
                  <div className="text-2xl font-bold text-red-600">{totalFabricDefects} шт</div>
                </div>
                <div className="text-center p-3 bg-emerald-100 rounded-lg border-2 border-emerald-300">
                  <div className="text-xs text-emerald-700 mb-1 font-medium">Итого зарплата</div>
                  <div className="text-2xl font-bold text-emerald-800">{totalSalary.toLocaleString('ru-RU')} ₽</div>
                  <div className="text-xs text-emerald-600">
                    {mainSalary.toLocaleString('ru-RU')} + {reworkSalary.toLocaleString('ru-RU')}
                  </div>
                </div>
              </div>
              {/* Расшифровка по изделиям */}
              {filteredAccepted.length > 0 && (
                <div className="bg-white/60 rounded-lg p-3">
                  <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Calculator className="h-3 w-3" /> Расшифровка по изделиям
                  </div>
                  <div className="space-y-1">
                    {(() => {
                      const byProduct: Record<string, { name: string; units: number; rate: number; reworkUnits: number; reworkRate: number }> = {}
                      filteredAccepted.forEach((t: TaskWithRelations) => {
                        const key = t.productId
                        if (!byProduct[key]) byProduct[key] = { name: t.product.name, units: 0, rate: t.product.sewerRate || 150, reworkUnits: 0, reworkRate: t.product.reworkRate || 80 }
                        byProduct[key].units += (t.actualQuantity || 0)
                      })
                      filteredReworksCompleted.forEach((r: Rework & { task?: TaskWithRelations }) => {
                        if (!r.task) return
                        const key = r.task.productId
                        if (!byProduct[key]) byProduct[key] = { name: r.task.product.name, units: 0, rate: r.task.product.sewerRate || 150, reworkUnits: 0, reworkRate: r.task.product.reworkRate || 80 }
                        byProduct[key].reworkUnits += r.quantity
                      })
                      return Object.values(byProduct).map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-emerald-100 last:border-0">
                          <span className="font-medium">{p.name}</span>
                          <span className="text-muted-foreground">
                            {p.units} шт x {p.rate} ₽{p.reworkUnits > 0 ? ` + ${p.reworkUnits} перед. x ${p.reworkRate} ₽` : ''} = <span className="font-semibold text-emerald-700">{(p.units * p.rate + p.reworkUnits * p.reworkRate).toLocaleString('ru-RU')} ₽</span>
                          </span>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Tasks */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Play className="h-5 w-5 text-amber-500" />
              Активные задания ({activeTasks.length})
            </h3>
            {activeTasks.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  Нет активных заданий
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {activeTasks.map((task: TaskWithRelations) => (
                  <Card key={task.id} className="hover:shadow-md transition-shadow">
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
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          Размер: {task.size}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getColorDot(task.colorHex)}
                          {task.color}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">План:</span>{' '}
                        <span className="font-semibold">{task.quantity} шт</span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        {task.status === 'new' && (
                          <Button
                            size="sm"
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white min-h-[44px]"
                            onClick={() => handleStartWork(task)}
                            disabled={updateTaskMutation.isPending}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Начать
                          </Button>
                        )}
                        {task.status === 'in_progress' && (
                          <Button
                            size="sm"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
                            onClick={() => handleOpenComplete(task)}
                            disabled={updateTaskMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Отшить
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Tasks pending QC */}
          {pendingQcTasks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Eye className="h-5 w-5 text-sky-500" />
                На проверке ОТК ({pendingQcTasks.length})
              </h3>
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
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          Размер: {task.size}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getColorDot(task.colorHex)}
                          {task.color}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">План:</span> {task.quantity} шт
                      </div>
                      <div>
                        <span className="text-muted-foreground">Факт:</span>{' '}
                        <span className="font-semibold">{task.actualQuantity} шт</span>
                      </div>
                      {task.fabricDefect > 0 && (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          Брак: {task.fabricDefect} шт
                        </div>
                      )}
                      <div className="text-xs text-sky-600 font-medium pt-1">
                        Ожидает проверки ОТК...
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Accepted by QC */}
          {acceptedTasks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                Принято ОТК ({acceptedTasks.length})
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {acceptedTasks.map((task: TaskWithRelations) => (
                  <Card key={task.id} className="opacity-80">
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
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          Размер: {task.size}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getColorDot(task.colorHex)}
                          {task.color}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">План:</span> {task.quantity} шт
                      </div>
                      <div>
                        <span className="text-muted-foreground">Факт:</span>{' '}
                        <span className="font-semibold">{task.actualQuantity} шт</span>
                      </div>
                      {task.fabricDefect > 0 && (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          Брак: {task.fabricDefect} шт
                        </div>
                      )}
                      {task.reworks.length > 0 && (
                        <div className="flex items-center gap-1 text-orange-600 text-xs">
                          <RotateCcw className="h-3 w-3" />
                          Переделок: {task.reworks.length}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Reworks assigned to this employee */}
          {employeeReworks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-orange-500" />
                Переделки ({employeeReworks.length})
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {employeeReworks.map((rework: Rework & { task?: TaskWithRelations }) => (
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
                          {rework.task.product?.article} · Размер {rework.task.size}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Причина:</span>{' '}
                        {rework.reason}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Количество:</span>{' '}
                        <span className="font-semibold">{rework.quantity} шт</span>
                      </div>
                      <div className="flex gap-2 pt-1">
                        {rework.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-amber-400 text-amber-700 hover:bg-amber-50 min-h-[44px]"
                            onClick={() =>
                              updateReworkMutation.mutate({ id: rework.id, status: 'in_progress' })
                            }
                            disabled={updateReworkMutation.isPending}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Начать
                          </Button>
                        )}
                        {rework.status === 'in_progress' && (
                          <Button
                            size="sm"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
                            onClick={() =>
                              updateReworkMutation.mutate({ id: rework.id, status: 'pending_qc' })
                            }
                            disabled={updateReworkMutation.isPending}
                          >
                            <ShieldCheck className="h-4 w-4 mr-1" />
                            Отправить на проверку ОТК
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Complete Task Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Завершить пошив</DialogTitle>
            <DialogDescription>
              Укажите фактическое количество — изделие будет отправлено на проверку ОТК
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Изделие:</span>
                  <p className="font-medium">{selectedTask.product.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Артикул:</span>
                  <p className="font-medium">{selectedTask.product.article}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Размер:</span>
                  <p className="font-medium">{selectedTask.size}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Цвет:</span>
                  <p className="font-medium">
                    {getColorDot(selectedTask.colorHex)}
                    {selectedTask.color}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="text-sm">
                <span className="text-muted-foreground">Плановое количество:</span>{' '}
                <span className="font-semibold">{selectedTask.quantity} шт</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="actualQty">Фактически отшито</Label>
                <Input
                  id="actualQty"
                  type="number"
                  min="0"
                  value={actualQty}
                  onChange={(e) => setActualQty(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fabricDefect">Тканевый брак, шт</Label>
                <Input
                  id="fabricDefect"
                  type="number"
                  min="0"
                  value={fabricDefect}
                  onChange={(e) => setFabricDefect(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defectNote">Примечание к браку</Label>
                <Textarea
                  id="defectNote"
                  placeholder="Опишите причину брака (необязательно)"
                  value={defectNote}
                  onChange={(e) => setDefectNote(e.target.value)}
                />
              </div>
              <div className="bg-sky-50 border border-sky-200 rounded-md p-3 text-sm text-sky-700">
                <Eye className="h-4 w-4 inline mr-1" />
                После завершения изделие будет отправлено на проверку ОТК
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
                  Отмена
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleComplete}
                  disabled={updateTaskMutation.isPending}
                >
                  {updateTaskMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Отшить и отправить на проверку
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
