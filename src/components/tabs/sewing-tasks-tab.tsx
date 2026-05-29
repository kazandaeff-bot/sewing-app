'use client'

import { useState, useCallback, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Plus, X, CheckCircle2, ClipboardList, Users, Printer } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Employee, CuttingPlan, CuttingPlanItem, SewingTask } from '@/types'
import { printDocument } from '@/lib/formatters'
import { getColorDot, getSewingTaskStatusBadge } from '@/lib/status-badges'

export function SewingTasksTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Distribution state
  const [selectedCuttingPlanId, setSelectedCuttingPlanId] = useState('')
  const [assignments, setAssignments] = useState<Array<{
    id: string
    cuttingPlanItemId: string
    employeeId: string
    quantity: number
  }>>([])
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const { data: sewingTasks = [], isLoading } = useQuery({
    queryKey: ['sewing-tasks'],
    queryFn: () => fetch('/api/sewing-tasks').then((r) => r.json()),
  })

  const { data: cuttingPlans = [] } = useQuery({
    queryKey: ['cutting-plans'],
    queryFn: () => fetch('/api/cutting-plans').then((r) => r.json()),
  })

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => fetch('/api/employees').then((r) => r.json()),
  })

  const cutPlans = cuttingPlans.filter((cp: CuttingPlan) => cp.status === 'cut')
  const sewers = employees.filter((e: Employee) => e.role === 'sewer')
  const selectedPlan = cutPlans.find((cp: CuttingPlan) => cp.id === selectedCuttingPlanId)

  // Compute stats per cutting plan item
  const getItemStats = useCallback((cpItem: CuttingPlanItem) => {
    const existingAssigned = (sewingTasks as SewingTask[])
      .filter((st) => st.cuttingPlanId === selectedCuttingPlanId)
      .flatMap((st) => st.items)
      .filter((item) =>
        item.productId === cpItem.productId &&
        item.size === cpItem.size &&
        item.color === cpItem.color
      )
      .reduce((sum, item) => sum + item.quantity, 0)

    const newAssigned = assignments
      .filter(a => a.cuttingPlanItemId === cpItem.id)
      .reduce((sum, a) => sum + a.quantity, 0)

    return {
      total: cpItem.plannedQty,
      assigned: existingAssigned + newAssigned,
      remaining: cpItem.plannedQty - existingAssigned - newAssigned,
      existingAssigned,
      newAssigned,
    }
  }, [sewingTasks, selectedCuttingPlanId, assignments])

  // Get existing assignments for display
  const getExistingAssignments = useCallback((cpItem: CuttingPlanItem) => {
    return (sewingTasks as SewingTask[])
      .filter((st) => st.cuttingPlanId === selectedCuttingPlanId)
      .flatMap((st) =>
        st.items
          .filter((item) =>
            item.productId === cpItem.productId &&
            item.size === cpItem.size &&
            item.color === cpItem.color
          )
          .map((item) => ({
            taskId: st.id,
            taskStatus: st.status,
            employeeName: st.employee.name,
            quantity: item.quantity,
          }))
      )
  }, [sewingTasks, selectedCuttingPlanId])

  // Assignment management
  const addAssignment = useCallback((cuttingPlanItemId: string) => {
    setAssignments(prev => [...prev, {
      id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cuttingPlanItemId,
      employeeId: '',
      quantity: 0,
    }])
  }, [])

  const removeAssignment = useCallback((id: string) => {
    setAssignments(prev => prev.filter(a => a.id !== id))
  }, [])

  const updateAssignment = useCallback((id: string, field: string, value: string | number) => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a))
  }, [])

  // Create sewing tasks from assignments
  const handleCreateTasks = useCallback(async () => {
    if (!selectedCuttingPlanId) {
      toast({ title: 'Ошибка', description: 'Выберите план раскроя', variant: 'destructive' })
      return
    }

    const validAssignments = assignments.filter(a => a.employeeId && a.quantity > 0)
    if (validAssignments.length === 0) {
      toast({ title: 'Ошибка', description: 'Добавьте хотя бы одно назначение', variant: 'destructive' })
      return
    }

    // Validate remaining for each position
    const plan = cutPlans.find((cp: CuttingPlan) => cp.id === selectedCuttingPlanId)
    if (!plan) return

    for (const cpItem of plan.items) {
      const stats = getItemStats(cpItem)
      if (stats.remaining < 0) {
        toast({
          title: 'Ошибка',
          description: `Превышено количество: ${cpItem.product.name} ${cpItem.size} ${cpItem.color}`,
          variant: 'destructive',
        })
        return
      }
    }

    setIsCreating(true)
    try {
      // Create one SewingTask per assignment (so each position can be sent to QC independently)
      const promises = validAssignments.map((assignment) => {
        const cpItem = plan.items.find(i => i.id === assignment.cuttingPlanItemId)
        if (!cpItem) return Promise.resolve(null)

        return fetch('/api/sewing-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cuttingPlanId: selectedCuttingPlanId,
            employeeId: assignment.employeeId,
            items: [{
              productId: cpItem.productId,
              size: cpItem.size,
              color: cpItem.color,
              colorHex: cpItem.colorHex,
              quantity: assignment.quantity,
            }],
          }),
        }).then(r => {
          if (!r.ok) return r.json().then(d => { throw new Error(d.error || 'Ошибка') })
          return r.json()
        })
      })

      const results = await Promise.all(promises)
      const created = results.filter(Boolean).length

      queryClient.invalidateQueries({ queryKey: ['sewing-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['cutting-plans'] })
      setAssignments([])
      toast({ title: 'Задания сформированы', description: `Создано ${created} заданий` })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Не удалось создать задания'
      toast({ title: 'Ошибка', description: msg, variant: 'destructive' })
    } finally {
      setIsCreating(false)
    }
  }, [selectedCuttingPlanId, assignments, cutPlans, getItemStats, queryClient, toast])

  // Status update for existing tasks
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/sewing-tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sewing-tasks'] })
      toast({ title: 'Статус обновлён', description: 'Статус задания изменён' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить статус', variant: 'destructive' })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <span className="ml-2 text-muted-foreground">Загрузка...</span>
      </div>
    )
  }

  const hasNewAssignments = assignments.some(a => a.employeeId && a.quantity > 0)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Задания для швей</h2>

      {/* ===== Distribution Section ===== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-emerald-600" />
              Распределение заданий
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Label className="text-sm">План раскроя</Label>
            <Select
              value={selectedCuttingPlanId}
              onValueChange={(v) => {
                setSelectedCuttingPlanId(v)
                setAssignments([])
                setExpandedRow(null)
              }}
            >
              <SelectTrigger><SelectValue placeholder="Выберите раскрой" /></SelectTrigger>
              <SelectContent>
                {cutPlans.length === 0 ? (
                  <SelectItem value="_none" disabled>Нет раскроенных планов</SelectItem>
                ) : (
                  cutPlans.map((cp: CuttingPlan) => (
                    <SelectItem key={cp.id} value={cp.id}>{cp.plan.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedPlan && (
            <>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Изделие</TableHead>
                        <TableHead>Размер</TableHead>
                        <TableHead>Цвет</TableHead>
                        <TableHead className="text-center">Всего</TableHead>
                        <TableHead className="text-center">Распределено</TableHead>
                        <TableHead className="text-center">Осталось</TableHead>
                        <TableHead>Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPlan.items.map((cpItem) => {
                        const stats = getItemStats(cpItem)
                        const isExpanded = expandedRow === cpItem.id
                        const itemAssignments = assignments.filter(a => a.cuttingPlanItemId === cpItem.id)
                        const existingAssignments = getExistingAssignments(cpItem)
                        const maxForNewAssignment = stats.remaining + itemAssignments.reduce((s, a) => s + a.quantity, 0)

                        return (
                          <Fragment key={cpItem.id}>
                            <TableRow
                              className={`cursor-pointer hover:bg-emerald-50/50 ${stats.remaining === 0 ? 'bg-emerald-50/30' : ''}`}
                              onClick={() => setExpandedRow(isExpanded ? null : cpItem.id)}
                            >
                              <TableCell className="font-medium">{cpItem.product.name}</TableCell>
                              <TableCell>{cpItem.size}</TableCell>
                              <TableCell>
                                <span className="flex items-center">
                                  {getColorDot(cpItem.colorHex)}
                                  {cpItem.color}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">{stats.total}</TableCell>
                              <TableCell className="text-center">{stats.assigned}</TableCell>
                              <TableCell className={`text-center font-medium ${stats.remaining > 0 ? 'text-amber-600' : stats.remaining === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                {stats.remaining}
                              </TableCell>
                              <TableCell>
                                {stats.remaining === 0 ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">Распределено</Badge>
                                ) : stats.assigned > 0 ? (
                                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">Частично</Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 text-xs">Не начато</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={7} className="bg-gray-50/50 p-4">
                                  <div className="space-y-3">
                                    {/* Existing assignments */}
                                    {existingAssignments.length > 0 && (
                                      <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground font-medium">Уже назначено:</Label>
                                        {existingAssignments.map((ea, idx) => (
                                          <div key={idx} className="flex items-center gap-2 text-sm bg-white rounded px-3 py-1.5 border">
                                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span className="font-medium">{ea.employeeName}</span>
                                            <span className="text-muted-foreground">—</span>
                                            <span>{ea.quantity} шт</span>
                                            {ea.taskStatus !== 'done' && (
                                              <Badge variant="outline" className="text-[10px] ml-auto">
                                                {ea.taskStatus === 'issued' ? 'Выдано' : ea.taskStatus === 'in_work' ? 'В работе' : ''}
                                              </Badge>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    {/* New assignment rows */}
                                    {itemAssignments.map((assignment) => (
                                      <div key={assignment.id} className="flex items-center gap-2 flex-wrap">
                                        <Select
                                          value={assignment.employeeId}
                                          onValueChange={(v) => updateAssignment(assignment.id, 'employeeId', v)}
                                        >
                                          <SelectTrigger className="w-52">
                                            <SelectValue placeholder="Выберите швею" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {sewers.map((s: Employee) => (
                                              <SelectItem key={s.id} value={s.id}>
                                                {s.name} ({s.code})
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Input
                                          type="number"
                                          min={1}
                                          max={maxForNewAssignment}
                                          className="w-20"
                                          placeholder="Кол-во"
                                          value={assignment.quantity || ''}
                                          onChange={(e) => {
                                            const val = parseInt(e.target.value) || 0
                                            updateAssignment(assignment.id, 'quantity', val)
                                          }}
                                        />
                                        <span className="text-xs text-muted-foreground">шт</span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => removeAssignment(assignment.id)}
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}

                                    {/* Add sewer button */}
                                    {stats.remaining > 0 && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => addAssignment(cpItem.id)}
                                      >
                                        <Plus className="h-4 w-4 mr-1" />
                                        {itemAssignments.length > 0 ? 'Добавить ещё швею' : 'Назначить швею'}
                                      </Button>
                                    )}

                                    {stats.remaining <= 0 && itemAssignments.length === 0 && (
                                      <p className="text-xs text-muted-foreground">Все изделия распределены</p>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Create tasks button */}
              {hasNewAssignments && (
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setAssignments([])}
                  >
                    Сбросить
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleCreateTasks}
                    disabled={isCreating}
                  >
                    {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Сформировать задания ({assignments.filter(a => a.employeeId && a.quantity > 0).length} назначений)
                  </Button>
                </div>
              )}
            </>
          )}

          {!selectedPlan && cutPlans.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Нет раскроенных планов для распределения. Утвердите план пошива и выполните раскрой.
            </p>
          )}
          {!selectedPlan && cutPlans.length > 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Выберите план раскроя для распределения заданий
            </p>
          )}
        </CardContent>
      </Card>

      {/* ===== Existing Sewing Tasks ===== */}
      {sewingTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Существующие задания</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sewingTasks.map((task: SewingTask) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{task.employee.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        План: {task.cuttingPlan.plan.name}
                      </p>
                    </div>
                    {getSewingTaskStatusBadge(task.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    {task.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="flex items-center">
                          {getColorDot(item.colorHex)}
                          {item.product.name} ({item.size})
                        </span>
                        <span className="font-medium">{item.quantity} шт</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    {task.status === 'issued' && (
                      <Button
                        size="sm"
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white min-h-[44px]"
                        onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'in_work' })}
                        disabled={updateStatusMutation.isPending}
                      >
                        В работу
                      </Button>
                    )}
                    {task.status === 'in_work' && (
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
                        onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'done' })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Готово
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => printDocument('sewing-task', task.id)}
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Печать
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
