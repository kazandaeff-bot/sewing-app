'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import {
  Scissors,
  ClipboardCheck,
  ClipboardList,
  ListTodo,
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Loader2,
  Eye,
  ShieldCheck,
  Users,
  Pencil,
  Trash2,
  Upload,
  X,
  LogOut,
  Wallet,
  Calculator,
  Factory,
  MapPin,
  Box,
  BookOpen,
  Store,
  FlaskConical,
  Heater,
  FileText,
  Package,
} from 'lucide-react'
import {
  SewingPlansTab,
  CuttingPlansTab,
  SewingTasksTab,
  CityDistributionTab,
  BoxesTab,
  ReferencesTab,
  StubTab,
  CustomerProductsTab,
  CustomerPlanTab,
} from '@/components/production-tabs'

// ============ Size Ordering ============
const SIZE_ORDER: string[] = [
  'XXS', '2XS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL',
  '80', '86', '92', '98', '104', '110', '116', '122', '128', '134', '140', '146', '152', '158', '164',
  '42', '44', '46', '48', '50', '52', '54', '56', '58', '60', '62', '64',
  'ONE SIZE',
]

const SIZE_ORDER_MAP = new Map(SIZE_ORDER.map((s, i) => [s, i]))

function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ai = SIZE_ORDER_MAP.get(a)
    const bi = SIZE_ORDER_MAP.get(b)
    if (ai !== undefined && bi !== undefined) return ai - bi
    if (ai !== undefined) return -1
    if (bi !== undefined) return 1
    return a.localeCompare(b, undefined, { numeric: true })
  })
}

// ============ Types ============
interface Employee {
  id: string
  name: string
  code: string
  role: string
}

interface ReworkReason {
  id: string
  productId: string
  text: string
}

interface ProductSize {
  id: string
  size: string
}

interface ProductColor {
  id: string
  color: string
  colorHex: string
}

interface Product {
  id: string
  name: string
  article: string
  imageUrl?: string | null
  sewerRate: number
  homeRate: number
  qcRate: number
  reworkRate: number
  isKit: boolean
  kitComboColors?: string | Record<string, string[]> | null
  reworkReasons: ReworkReason[]
  sizes: ProductSize[]
  colors: ProductColor[]
}

interface Rework {
  id: string
  taskId: string
  quantity: number
  reason: string
  status: string
  createdAt: string
  updatedAt: string
  task?: TaskWithRelations
}

interface TaskWithRelations {
  id: string
  employeeId: string
  productId: string
  size: string
  color: string
  colorHex: string
  quantity: number
  status: string
  actualQuantity: number | null
  fabricDefect: number
  defectNote: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  employee: Employee
  product: Product
  reworks: Rework[]
}

interface Stats {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  pendingQcTasks: number
  newTasks: number
  totalReworks: number
  pendingReworks: number
  totalFabricDefects: number
  perEmployee: {
    id: string
    name: string
    code: string
    role: string
    totalTasks: number
    completed: number
    inProgress: number
    pendingQc: number
    new: number
    totalDefects: number
    totalReworks: number
    pendingReworks: number
  }[]
}

interface City {
  id: string
  name: string
}

interface BoxTypeCapacity {
  id: string
  productId: string
  size: string
  maxQty: number
  product?: Product
}

interface BoxType {
  id: string
  name: string
  dimensions: string
  capacities: BoxTypeCapacity[]
}

interface SewingTaskResponse {
  id: string
  cuttingPlanId: string
  employeeId: string
  status: 'issued' | 'in_work' | 'pending_qc' | 'completed'
  cuttingPlan: { id: string; plan: { id: string; name: string } }
  employee: { id: string; name: string; code: string }
  items: SewingTaskItemResponse[]
  reworks: SewingReworkResponse[]
  createdAt: string
  updatedAt: string
}

interface SewingTaskItemResponse {
  id: string
  sewingTaskId: string
  productId: string
  size: string
  color: string
  colorHex: string
  quantity: number
  actualQuantity: number | null
  fabricDefect: number
  defectNote: string | null
  product: { id: string; name: string; article: string; sewerRate: number; qcRate: number; reworkRate: number }
  reworks: SewingReworkResponse[]
}

interface SewingReworkResponse {
  id: string
  sewingTaskItemId: string
  sewingTaskId: string
  quantity: number
  reason: string
  status: 'pending' | 'in_progress' | 'pending_qc' | 'completed'
  sewingTaskItem: { id: string; product: { name: string }; size: string; color: string }
  sewingTask: { id: string; employee: { name: string } }
  createdAt: string
  updatedAt: string
}

// ============ Helpers ============
function getStatusBadge(status: string) {
  switch (status) {
    case 'new':
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">Новое</Badge>
    case 'in_progress':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">В работе</Badge>
    case 'pending_qc':
      return <Badge variant="secondary" className="bg-sky-100 text-sky-700 hover:bg-sky-100">На проверке ОТК</Badge>
    case 'completed':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Принято ОТК</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getReworkStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Ожидает</Badge>
    case 'in_progress':
      return <Badge variant="secondary" className="bg-sky-100 text-sky-700 hover:bg-sky-100">В работе</Badge>
    case 'pending_qc':
      return <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100">На проверке ОТК</Badge>
    case 'completed':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Завершено</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getColorDot(colorHex: string) {
  return <span style={{ backgroundColor: colorHex || '#9ca3af' }} className="inline-block w-3 h-3 rounded-full mr-1.5 align-middle border border-gray-200" />
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'sewer': return 'Швея'
    case 'qc': return 'ОТК'
    case 'supervisor': return 'Руководитель'
    case 'seller': return 'Селлер'
    case 'technologist': return 'Технолог'
    case 'cutter': return 'Закройщик'
    case 'ironing': return 'ВТО'
    case 'customer': return 'Заказчик'
    default: return role
  }
}

// ============ TAB 1: ШВЕЯ ============
function SewerTab({ preselectedEmployeeId }: { preselectedEmployeeId?: string }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(preselectedEmployeeId || '')
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [selectedSewingTask, setSelectedSewingTask] = useState<SewingTaskResponse | null>(null)
  const [completeItems, setCompleteItems] = useState<Array<{ id: string; sendQty: string; actualQuantity: string; fabricDefect: string; defectNote: string }>>([])
  const [isPartialSubmit, setIsPartialSubmit] = useState(false)
  const [salaryPeriod, setSalaryPeriod] = useState<'week' | 'month' | 'all'>('month')

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
      setCompleteItems(task.items.map((item: SewingTaskItemResponse) => ({
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
          status: 'pending_qc',
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

  // Group tasks by status (also handle legacy 'done' status)
  const issuedTasks = sewingTasks.filter((t: any) => t.status === 'issued')
  const inWorkTasks = sewingTasks.filter((t: any) => t.status === 'in_work')
  const pendingQcTasks = sewingTasks.filter((t: any) => t.status === 'pending_qc')
  const completedTasks = sewingTasks.filter((t: any) => t.status === 'completed' || t.status === 'done')

  // Salary calculation for completed tasks
  const now = new Date()
  const filteredCompleted = completedTasks.filter((t: any) => {
    if (salaryPeriod === 'all') return true
    const updatedAt = t.updatedAt ? new Date(t.updatedAt) : null
    if (!updatedAt) return false
    const diffDays = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    return salaryPeriod === 'week' ? diffDays <= 7 : diffDays <= 30
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
                          <div className="font-medium">{item.product?.name}</div>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs">Р: {item.size}</Badge>
                            <Badge variant="outline" className="text-xs gap-1">
                              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: item.colorHex || '#9ca3af' }} />
                              {item.color}
                            </Badge>
                          </div>
                          <div><span className="text-muted-foreground">Кол-во:</span> <span className="font-semibold">{item.quantity} шт</span></div>
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
                          <div className="font-medium">{item.product?.name}</div>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs">Р: {item.size}</Badge>
                            <Badge variant="outline" className="text-xs gap-1">
                              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: item.colorHex || '#9ca3af' }} />
                              {item.color}
                            </Badge>
                          </div>
                          <div><span className="text-muted-foreground">Кол-во:</span> <span className="font-semibold">{item.quantity} шт</span></div>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
                        onClick={() => handleOpenComplete(task)}
                        disabled={updateSewingTaskMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Отшить
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* На проверке ОТК (pending_qc) */}
          {pendingQcTasks.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Eye className="h-5 w-5 text-sky-500" />
                На проверке ОТК ({pendingQcTasks.length})
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pendingQcTasks.map((task: any) => (
                  <Card key={task.id} className="border-sky-200 bg-sky-50/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">Задание #{task.id.slice(-6)}</CardTitle>
                          <CardDescription className="text-xs">
                            {task.cuttingPlan?.plan?.name || 'План раскроя'}
                          </CardDescription>
                        </div>
                        <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 text-xs">На проверке</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {task.items.map((item: any) => (
                        <div key={item.id} className="text-sm space-y-1">
                          <div className="font-medium">{item.product?.name}</div>
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
                        </div>
                      ))}
                      <div className="text-xs text-sky-600 font-medium pt-1">
                        Ожидает проверки ОТК...
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
                          <div className="font-medium">{item.product?.name}</div>
                          <div><span className="text-muted-foreground">План:</span> {item.quantity} | <span className="text-muted-foreground">Факт:</span> <span className="font-semibold">{item.actualQuantity ?? item.quantity} шт</span></div>
                          {(item.fabricDefect > 0) && (
                            <div className="text-red-600 text-xs">Брак: {item.fabricDefect} шт</div>
                          )}
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

              {selectedSewingTask.items.map((item: SewingTaskItemResponse, idx: number) => (
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

// ============ TAB 2: ОТК ============
function QCTab() {
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

  const { data: pendingQcTasks = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['sewing-tasks', 'status', 'pending_qc'],
    queryFn: () => fetch('/api/sewing-tasks?status=pending_qc').then((r) => r.json()),
  })

  const { data: completedTasks = [], isLoading: completedLoading } = useQuery({
    queryKey: ['sewing-tasks', 'status', 'completed'],
    queryFn: () => fetch('/api/sewing-tasks?status=completed').then((r) => r.json()),
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
      toast({ title: 'Задание принято', description: 'Изделие прошло проверку ОТК' })
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

  const handleAccept = useCallback(
    (task: SewingTaskResponse) => {
      updateTaskMutation.mutate({ id: task.id, data: { status: 'completed' } })
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

  // ============ Расчёт зарплаты ОТК ============
  const qcNow = new Date()
  const filterByPeriod = (dateStr: string | null): boolean => {
    if (qcSalaryPeriod === 'all') return true
    if (!dateStr) return false
    const diffDays = (qcNow.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
    return qcSalaryPeriod === 'week' ? diffDays <= 7 : diffDays <= 30
  }
  // Принятые ОТК задания — completed SewingTasks
  const qcAcceptedFiltered = completedTasks.filter((t: SewingTaskResponse) => filterByPeriod(t.updatedAt))
  // Flatten items from completed tasks for salary calc
  const qcCompletedItems = qcAcceptedFiltered.flatMap((t: SewingTaskResponse) =>
    t.items.map((item: SewingTaskItemResponse) => ({
      ...item,
      taskUpdatedAt: t.updatedAt,
    }))
  )
  // Переделки, проверенные ОТК (status = completed)
  const qcReworksChecked = reworks.filter((r: SewingReworkResponse) => r.status === 'completed' && filterByPeriod(r.updatedAt))
  // Количество проверенных единиц
  const qcTotalUnitsChecked = qcCompletedItems.reduce((sum: number, item: SewingTaskItemResponse) => sum + (item.actualQuantity || item.quantity), 0)
  const qcTotalReworksChecked = qcReworksChecked.reduce((sum: number, r: SewingReworkResponse) => sum + r.quantity, 0)
  const qcTotalInspected = qcTotalUnitsChecked + qcTotalReworksChecked
  // Зарплата с учётом ставок по каждому изделию
  const qcSalaryMain = qcCompletedItems.reduce((sum: number, item: SewingTaskItemResponse) => {
    return sum + (item.actualQuantity || item.quantity) * (item.product.qcRate || 50)
  }, 0)
  const qcSalaryReworks = qcReworksChecked.reduce((sum: number, r: SewingReworkResponse) => {
    return sum + r.quantity * (r.sewingTaskItem?.product?.qcRate || 50)
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
          {qcCompletedItems.length > 0 && (
            <div className="bg-white/60 rounded-lg p-3">
              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Calculator className="h-3 w-3" /> Расшифровка по изделиям
              </div>
              <div className="space-y-1">
                {(() => {
                  const byProduct: Record<string, { name: string; units: number; rate: number; reworkUnits: number }> = {}
                  qcCompletedItems.forEach((item: SewingTaskItemResponse) => {
                    const key = item.productId
                    if (!byProduct[key]) byProduct[key] = { name: item.product?.name || 'Изделие', units: 0, rate: item.product?.qcRate || 50, reworkUnits: 0 }
                    byProduct[key].units += (item.actualQuantity || item.quantity)
                  })
                  qcReworksChecked.forEach((r: SewingReworkResponse) => {
                    const key = r.sewingTaskItemId
                    const productName = r.sewingTaskItem?.product?.name || 'Изделие'
                    const rate = r.sewingTaskItem?.product?.qcRate || 50
                    if (!byProduct[key]) byProduct[key] = { name: productName, units: 0, rate, reworkUnits: 0 }
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

      {/* PENDING QC — SewingTasks waiting for initial inspection */}
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
            {pendingQcTasks.map((task: SewingTaskResponse) => (
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
                  {task.items.map((item: SewingTaskItemResponse) => (
                    <div key={item.id} className="text-sm space-y-1 border-b border-sky-100 last:border-0 pb-2 last:pb-0">
                      <div className="font-medium">{item.product?.name} <span className="text-muted-foreground text-xs">({item.product?.article})</span></div>
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
                          variant="outline"
                          className="flex-1 border-orange-400 text-orange-700 hover:bg-orange-50 min-h-[36px] text-xs"
                          onClick={() => handleOpenRework(task, item)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          На переделку
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
                    onClick={() => handleAccept(task)}
                    disabled={updateTaskMutation.isPending}
                  >
                    <ShieldCheck className="h-4 w-4 mr-1" />
                    Принять всё задание
                  </Button>
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
            {completedTasks.map((task: SewingTaskResponse) => (
              <Card key={task.id}>
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
                  {task.items.map((item: SewingTaskItemResponse) => (
                    <div key={item.id} className="text-sm space-y-1 border-b last:border-0 pb-2 last:pb-0">
                      <div className="font-medium">{item.product?.name}</div>
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

// ============ TAB 3: ЗАДАНИЯ ============
function TasksTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null)

  // Create form state
  const [newEmployeeId, setNewEmployeeId] = useState('')
  const [newProductId, setNewProductId] = useState('')
  const [newSize, setNewSize] = useState('')
  const [newColor, setNewColor] = useState('')
  const [newColorHex, setNewColorHex] = useState('#9ca3af')
  const [newQuantity, setNewQuantity] = useState('')

  // Edit form state
  const [editEmployeeId, setEditEmployeeId] = useState('')
  const [editProductId, setEditProductId] = useState('')
  const [editSize, setEditSize] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editColorHex, setEditColorHex] = useState('#9ca3af')
  const [editQuantity, setEditQuantity] = useState('')

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => fetch('/api/employees').then((r) => r.json()),
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then((r) => r.json()),
  })

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'all', statusFilter],
    queryFn: () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      return fetch(`/api/tasks${params}`).then((r) => r.json())
    },
  })

  const createTaskMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setCreateOpen(false)
      setNewEmployeeId('')
      setNewProductId('')
      setNewSize('')
      setNewColor('')
      setNewColorHex('#9ca3af')
      setNewQuantity('')
      toast({ title: 'Задание создано', description: 'Новое задание добавлено' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось создать задание', variant: 'destructive' })
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
      setEditOpen(false)
      toast({ title: 'Задание обновлено', description: 'Изменения сохранены' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить задание', variant: 'destructive' })
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/tasks/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setDeleteOpen(false)
      setSelectedTask(null)
      toast({ title: 'Задание удалено', description: 'Задание успешно удалено' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось удалить задание', variant: 'destructive' })
    },
  })

  const handleCreate = useCallback(() => {
    if (!newEmployeeId || !newProductId || !newSize || !newColor || !newQuantity) return
    createTaskMutation.mutate({
      employeeId: newEmployeeId,
      productId: newProductId,
      size: newSize,
      color: newColor,
      colorHex: newColorHex,
      quantity: newQuantity,
    })
  }, [newEmployeeId, newProductId, newSize, newColor, newColorHex, newQuantity, createTaskMutation])

  const handleOpenEdit = useCallback((task: TaskWithRelations) => {
    setSelectedTask(task)
    setEditEmployeeId(task.employeeId)
    setEditProductId(task.productId)
    setEditSize(task.size)
    setEditColor(task.color)
    setEditColorHex(task.colorHex)
    setEditQuantity(String(task.quantity))
    setEditOpen(true)
  }, [])

  const handleEdit = useCallback(() => {
    if (!selectedTask) return
    updateTaskMutation.mutate({
      id: selectedTask.id,
      data: {
        employeeId: editEmployeeId,
        productId: editProductId,
        size: editSize,
        color: editColor,
        colorHex: editColorHex,
        quantity: editQuantity,
      },
    })
  }, [selectedTask, editEmployeeId, editProductId, editSize, editColor, editColorHex, editQuantity, updateTaskMutation])

  const handleOpenDelete = useCallback((task: TaskWithRelations) => {
    setSelectedTask(task)
    setDeleteOpen(true)
  }, [])

  const sewers = employees.filter((e: Employee) => e.role === 'sewer')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="new">Новое</SelectItem>
              <SelectItem value="in_progress">В работе</SelectItem>
              <SelectItem value="pending_qc">На проверке ОТК</SelectItem>
              <SelectItem value="completed">Принято</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Новое задание
        </Button>
      </div>

      {tasksLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : tasks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            Нет заданий
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task: TaskWithRelations) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{task.product.name}</CardTitle>
                    <CardDescription className="text-xs">{task.product.article}</CardDescription>
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
                    <div className="font-semibold">{task.actualQuantity ?? '—'}</div>
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
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 min-h-[44px]"
                    onClick={() => handleOpenEdit(task)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Изменить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50 min-h-[44px]"
                    onClick={() => handleOpenDelete(task)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новое задание</DialogTitle>
            <DialogDescription>Создайте задание для швеи</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Швея</Label>
              <Select value={newEmployeeId} onValueChange={setNewEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Выберите швею --" />
                </SelectTrigger>
                <SelectContent>
                  {sewers.map((e: Employee) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Изделие</Label>
              <Select value={newProductId} onValueChange={setNewProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Выберите изделие --" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: Product) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.article})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Размер</Label>
                <Input value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder="46" />
              </div>
              <div className="space-y-2">
                <Label>Количество</Label>
                <Input type="number" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} placeholder="10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Цвет</Label>
              <div className="flex gap-2 items-center">
                <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="синий" className="flex-1" />
                <input
                  type="color"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleCreate}
                disabled={createTaskMutation.isPending || !newEmployeeId || !newProductId || !newSize || !newColor || !newQuantity}
              >
                {createTaskMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Plus className="h-4 w-4 mr-1" />
                Создать
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Редактировать задание</DialogTitle>
            <DialogDescription>Измените параметры задания</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Швея</Label>
              <Select value={editEmployeeId} onValueChange={setEditEmployeeId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sewers.map((e: Employee) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name} ({e.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Изделие</Label>
              <Select value={editProductId} onValueChange={setEditProductId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: Product) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.article})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Размер</Label>
                <Input value={editSize} onChange={(e) => setEditSize(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Количество</Label>
                <Input type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Цвет</Label>
              <div className="flex gap-2 items-center">
                <Input value={editColor} onChange={(e) => setEditColor(e.target.value)} className="flex-1" />
                <input
                  type="color"
                  value={editColorHex}
                  onChange={(e) => setEditColorHex(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Отмена</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleEdit}
                disabled={updateTaskMutation.isPending}
              >
                {updateTaskMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Сохранить
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить задание?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Задание &laquo;{selectedTask?.product?.name}&raquo; будет удалено навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => selectedTask && deleteTaskMutation.mutate(selectedTask.id)}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============ TAB 4: СОТРУДНИКИ ============
function EmployeesTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newRole, setNewRole] = useState('sewer')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editRole, setEditRole] = useState('sewer')
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => fetch('/api/employees').then((r) => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      setCreateOpen(false)
      setNewName('')
      setNewCode('')
      setNewRole('sewer')
      setNewUsername('')
      setNewPassword('')
      toast({ title: 'Сотрудник добавлен', description: 'Новый сотрудник создан' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось добавить сотрудника', variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, string> }) =>
      fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      setEditOpen(false)
      setEditPassword('')
      toast({ title: 'Сотрудник обновлён', description: 'Изменения сохранены' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить сотрудника', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/employees/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      setDeleteOpen(false)
      setSelectedEmployee(null)
      toast({ title: 'Сотрудник удалён', description: 'Сотрудник успешно удалён' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось удалить сотрудника', variant: 'destructive' })
    },
  })

  const handleOpenEdit = useCallback((emp: Employee & { username?: string }) => {
    setSelectedEmployee(emp)
    setEditName(emp.name)
    setEditCode(emp.code)
    setEditRole(emp.role)
    setEditUsername((emp as { username?: string }).username || '')
    setEditPassword('')
    setEditOpen(true)
  }, [])

  const handleOpenDelete = useCallback((emp: Employee) => {
    setSelectedEmployee(emp)
    setDeleteOpen(true)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  const roleOptions = [
    { value: 'sewer', label: 'Швея' },
    { value: 'qc', label: 'ОТК' },
    { value: 'supervisor', label: 'Руководитель' },
    { value: 'seller', label: 'Селлер' },
    { value: 'technologist', label: 'Технолог' },
    { value: 'cutter', label: 'Закройщик' },
    { value: 'ironing', label: 'ВТО' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Добавить сотрудника
        </Button>
      </div>

      {employees.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Сотрудники не добавлены</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp: Employee) => (
            <Card key={emp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{emp.name}</div>
                    <div className="text-sm text-muted-foreground">{emp.code}</div>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {getRoleLabel(emp.role)}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleOpenEdit(emp)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      onClick={() => handleOpenDelete(emp)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Employee Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новый сотрудник</DialogTitle>
            <DialogDescription>Добавьте нового сотрудника</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ФИО</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Иванова Мария" />
            </div>
            <div className="space-y-2">
              <Label>Код</Label>
              <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Ш-001" />
            </div>
            <div className="space-y-2">
              <Label>Логин</Label>
              <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="sewer1" />
            </div>
            <div className="space-y-2">
              <Label>Пароль</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="123456" />
            </div>
            <div className="space-y-2">
              <Label>Роль</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => createMutation.mutate({ name: newName, code: newCode, role: newRole, username: newUsername, password: newPassword })}
                disabled={createMutation.isPending || !newName || !newCode || !newUsername || !newPassword}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Добавить
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Редактировать сотрудника</DialogTitle>
            <DialogDescription>Измените данные сотрудника</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ФИО</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Код</Label>
              <Input value={editCode} onChange={(e) => setEditCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Логин</Label>
              <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Пароль</Label>
              <Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Оставьте пустым, чтобы не менять" />
              <p className="text-xs text-muted-foreground">Оставьте пустым, чтобы не менять пароль</p>
            </div>
            <div className="space-y-2">
              <Label>Роль</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Отмена</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  if (selectedEmployee) {
                    const data: Record<string, string> = { name: editName, code: editCode, role: editRole, username: editUsername }
                    if (editPassword) data.password = editPassword
                    updateMutation.mutate({ id: selectedEmployee.id, data })
                  }
                }}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Сохранить
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сотрудника?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Сотрудник &laquo;{selectedEmployee?.name}&raquo; будет удалён навсегда вместе со всеми связанными заданиями.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => selectedEmployee && deleteMutation.mutate(selectedEmployee.id)}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============ MAIN PAGE ============
export default function HomePage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const userRole = user?.role || ''

  if (loading) {
    return (<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-emerald-600" /><span className="ml-3 text-muted-foreground">Загрузка...</span></div>)
  }

  // If not logged in, show home page with login and production buttons
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-emerald-200">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto bg-emerald-600 text-white rounded-xl p-4 w-fit">
              <Scissors className="h-10 w-10" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-emerald-700">Швейное Производство</CardTitle>
              <CardDescription className="mt-2">Система управления производством</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white min-h-[48px] text-base"
              onClick={() => router.push('/')}
            >
              <Factory className="h-5 w-5 mr-2" />
              Производство
            </Button>
            <Button
              variant="outline"
              className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 min-h-[48px] text-base"
              onClick={() => router.push('/login')}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Войти в систему
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleLogout = async () => { await logout(); router.push('/login') }

  // Seller: redirect to production
  if (userRole === 'seller') {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div><h1 className="text-2xl font-bold text-gray-900">{user.name}</h1><p className="text-sm text-muted-foreground">{getRoleLabel(userRole)}</p></div>
            <Button variant="outline" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Выйти</Button>
          </div>
          <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Store className="h-16 w-16 mb-4 opacity-20" /><p className="text-lg font-medium">Ваш раздел — Производство</p><p className="text-sm mt-1 mb-4">Перейдите в раздел Производство для работы</p><Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { router.push('/') }}><Factory className="h-4 w-4 mr-2" />Производство →</Button></CardContent></Card>
        </div>
      </div>
    )
  }

  // Technologist, Cutter, Ironing: stub
  if (userRole === 'technologist' || userRole === 'cutter' || userRole === 'ironing') {
    const RoleIcon = userRole === 'technologist' ? FlaskConical : userRole === 'cutter' ? Scissors : Heater
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div><h1 className="text-2xl font-bold text-gray-900">{user.name}</h1><p className="text-sm text-muted-foreground">{getRoleLabel(userRole)}</p></div>
            <Button variant="outline" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Выйти</Button>
          </div>
          <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground"><RoleIcon className="h-16 w-16 mb-4 opacity-20" /><p className="text-lg font-medium">Раздел в разработке</p><p className="text-sm mt-1">Данный раздел будет доступен позже</p></CardContent></Card>
        </div>
      </div>
    )
  }

  // Sewer: only SewerTab
  if (userRole === 'sewer') {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div><h1 className="text-2xl font-bold text-gray-900">{user.name}</h1><p className="text-sm text-muted-foreground">{getRoleLabel(userRole)}</p></div>
            <Button variant="outline" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Выйти</Button>
          </div>
          <SewerTab preselectedEmployeeId={user.id} />
        </div>
      </div>
    )
  }

  // QC: only QCTab
  if (userRole === 'qc') {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div><h1 className="text-2xl font-bold text-gray-900">{user.name}</h1><p className="text-sm text-muted-foreground">{getRoleLabel(userRole)}</p></div>
            <Button variant="outline" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Выйти</Button>
          </div>
          <QCTab />
        </div>
      </div>
    )
  }

  // Customer: limited tabs — own plans, distribution, boxes, products (without rates)
  if (userRole === 'customer') {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-sm text-muted-foreground">Личный кабинет заказчика</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />Выйти
            </Button>
          </div>
          <Tabs defaultValue="plans" className="w-full">
            <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="plans" className="gap-1.5">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Мой план</span>
                <span className="sm:hidden">План</span>
              </TabsTrigger>
              <TabsTrigger value="distribution" className="gap-1.5">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Города</span>
                <span className="sm:hidden">Города</span>
              </TabsTrigger>
              <TabsTrigger value="boxes" className="gap-1.5">
                <Box className="h-4 w-4" />
                <span className="hidden sm:inline">Короба</span>
                <span className="sm:hidden">Короба</span>
              </TabsTrigger>
              <TabsTrigger value="products" className="gap-1.5">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Мои изделия</span>
                <span className="sm:hidden">Изделия</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="plans" className="mt-6">
              <CustomerPlanTab customerId={user.customerId ?? null} />
            </TabsContent>
            <TabsContent value="distribution" className="mt-6">
              <CityDistributionTab customerId={user.customerId} />
            </TabsContent>
            <TabsContent value="boxes" className="mt-6">
              <BoxesTab customerId={user.customerId} />
            </TabsContent>
            <TabsContent value="products" className="mt-6">
              <CustomerProductsTab customerId={user.customerId ?? null} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    )
  }

  // Supervisor: all tabs including production management
  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div><h1 className="text-2xl font-bold text-gray-900">{user.name}</h1><p className="text-sm text-muted-foreground">{getRoleLabel(userRole)}</p></div>
          <Button variant="outline" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Выйти</Button>
        </div>
        <Tabs defaultValue="plans" className="w-full">
          <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="plans" className="gap-1.5"><FileText className="h-4 w-4" /><span className="hidden sm:inline">Планы пошива</span><span className="sm:hidden">Планы</span></TabsTrigger>
            <TabsTrigger value="cutting" className="gap-1.5"><Scissors className="h-4 w-4" /><span className="hidden sm:inline">Раскрой</span><span className="sm:hidden">Раскрой</span></TabsTrigger>
            <TabsTrigger value="sewing-tasks" className="gap-1.5"><ListTodo className="h-4 w-4" /><span className="hidden sm:inline">Задания швеям</span><span className="sm:hidden">Задания</span></TabsTrigger>
            <TabsTrigger value="sewers" className="gap-1.5"><Scissors className="h-4 w-4" /><span className="hidden sm:inline">Швеи</span><span className="sm:hidden">Швеи</span></TabsTrigger>
            <TabsTrigger value="qc" className="gap-1.5"><ClipboardCheck className="h-4 w-4" /><span className="hidden sm:inline">ОТК</span><span className="sm:hidden">ОТК</span></TabsTrigger>
            <TabsTrigger value="distribution" className="gap-1.5"><MapPin className="h-4 w-4" /><span className="hidden sm:inline">Города</span><span className="sm:hidden">Города</span></TabsTrigger>
            <TabsTrigger value="boxes" className="gap-1.5"><Box className="h-4 w-4" /><span className="hidden sm:inline">Короба</span><span className="sm:hidden">Короба</span></TabsTrigger>
            <TabsTrigger value="employees" className="gap-1.5"><Users className="h-4 w-4" /><span className="hidden sm:inline">Сотрудники</span><span className="sm:hidden">Сотрудники</span></TabsTrigger>
            <TabsTrigger value="references" className="gap-1.5"><BookOpen className="h-4 w-4" /><span className="hidden sm:inline">Справочники</span><span className="sm:hidden">Справ.</span></TabsTrigger>
          </TabsList>
          <TabsContent value="plans" className="mt-6"><SewingPlansTab /></TabsContent>
          <TabsContent value="cutting" className="mt-6"><CuttingPlansTab /></TabsContent>
          <TabsContent value="sewing-tasks" className="mt-6"><SewingTasksTab /></TabsContent>
          <TabsContent value="sewers" className="mt-6"><SewerTab /></TabsContent>
          <TabsContent value="qc" className="mt-6"><QCTab /></TabsContent>
          <TabsContent value="distribution" className="mt-6"><CityDistributionTab /></TabsContent>
          <TabsContent value="boxes" className="mt-6"><BoxesTab /></TabsContent>
          <TabsContent value="employees" className="mt-6"><EmployeesTab /></TabsContent>
          <TabsContent value="references" className="mt-6"><ReferencesTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  )
}