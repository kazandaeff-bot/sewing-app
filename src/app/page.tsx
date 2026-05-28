'use client'

// Force dynamic rendering to prevent CDN caching of stale HTML
export const dynamic = 'force-dynamic'

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
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import {
  Scissors,
  ClipboardCheck,
  ClipboardList,
  ListTodo,
  BarChart3,
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Plus,
  Loader2,
  Eye,
  ShieldCheck,
  Users,
  Package,
  Pencil,
  Trash2,
  Upload,
  X,
  Image as ImageIcon,
  LogOut,
  Wallet,
  Calculator,
  Factory,
  MapPin,
  Box,
  BookOpen,
  Store,
  FlaskConical,
  Shirt,
  Heater,
  ChevronRight,
  FileText,
  Truck,
  Clock,
  Camera,
  Printer,
  Flame,
} from 'lucide-react'
import {
  SewingPlansTab,
  CuttingPlansTab,
  SewingTasksTab,
  CityDistributionTab,
  BoxesTab,
  ReferencesTab,
  StubTab,
  CuttingLeftoversTab,
} from '@/components/production-tabs'

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
  ironingRate: number
  cuttingRate: number
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
  status: 'issued' | 'in_work' | 'pending_ironing' | 'pending_qc' | 'completed'
  cuttingPlan: { id: string; plan: { id: string; name: string } }
  employee: { id: string; name: string; code: string }
  items: SewingTaskItemResponse[]
  reworks: SewingReworkResponse[]
  createdAt: string
  updatedAt: string
}

interface SewingTaskItemResponse {
  id: string
  status: string  // issued | in_work | pending_ironing | ironed | pending_qc | completed
  sewingTaskId: string
  productId: string
  size: string
  color: string
  colorHex: string
  quantity: number
  actualQuantity: number | null
  fabricDefect: number
  defectNote: string | null
  startedAt: string | null
  ironedAt: string | null
  qcAt: string | null
  completedAt: string | null
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
  sewingTaskItem: { id: string; product: { name: string; qcRate: number }; size: string; color: string }
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
    default: return role
  }
}

function formatTiming(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${day}.${month} ${hours}:${minutes}`
  } catch {
    return ''
  }
}

function ItemTimingInfo({ item }: { item: { startedAt?: string | null; ironedAt?: string | null; qcAt?: string | null; completedAt?: string | null } }) {
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

function getItemStatusBadge(status: string) {
  switch (status) {
    case 'issued':
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100 text-xs">Выдано</Badge>
    case 'in_work':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">В работе</Badge>
    case 'pending_ironing':
      return <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs">На ВТО</Badge>
    case 'ironed':
      return <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-xs">Отглажено</Badge>
    case 'pending_qc':
      return <Badge variant="secondary" className="bg-sky-100 text-sky-700 hover:bg-sky-100 text-xs">На ОТК</Badge>
    case 'completed':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">Готово</Badge>
    default:
      return <Badge variant="secondary" className="text-xs">{status}</Badge>
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
  const qcNow = new Date()
  const filterByPeriod = (dateStr: string | null): boolean => {
    if (qcSalaryPeriod === 'all') return true
    if (!dateStr) return false
    const diffDays = (qcNow.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
    return qcSalaryPeriod === 'week' ? diffDays <= 7 : diffDays <= 30
  }

  // Flatten items with completed status from all tasks for salary calc
  const qcCompletedItems = allSewingTasks
    .filter((t: SewingTaskResponse) => filterByPeriod(t.updatedAt))
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
  const qcReworksChecked = reworks.filter((r: SewingReworkResponse) => r.status === 'completed' && filterByPeriod(r.updatedAt))
  // Количество проверенных единиц (только основные изделия, без переделок)
  const qcTotalUnitsChecked = qcCompletedItems.reduce((sum: number, item: SewingTaskItemResponse) => sum + (item.actualQuantity || item.quantity), 0)
  const qcTotalReworksChecked = qcReworksChecked.reduce((sum: number, r: SewingReworkResponse) => sum + r.quantity, 0)
  // Зарплата: только по принятым изделиям из плана (переделки не оплачиваются дополнительно)
  const qcSalary = qcCompletedItems.reduce((sum: number, item: SewingTaskItemResponse) => {
    return sum + (item.actualQuantity || item.quantity) * (item.product.qcRate || 50)
  }, 0)
  const qcPeriodLabel = qcSalaryPeriod === 'week' ? 'за неделю' : qcSalaryPeriod === 'month' ? 'за месяц' : 'за всё время'

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

// ============ TAB: ВТО (Ironing) ============
function IroningTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [salaryPeriod, setSalaryPeriod] = useState<'week' | 'month' | 'all'>('month')

  const IRONING_RATE = 10 // ₽ per unit

  const { data: ironingGroups = [], isLoading: ironingLoading } = useQuery({
    queryKey: ['ironing-items'],
    queryFn: () => fetch('/api/ironing').then((r) => r.json()),
  })

  // Fetch all sewing tasks to find ironed items for salary calc
  const { data: allSewingTasks = [] } = useQuery({
    queryKey: ['sewing-tasks', 'ironing-all'],
    queryFn: () => fetch('/api/sewing-tasks').then((r) => r.json()),
  })

  const ironingMutation = useMutation({
    mutationFn: (itemIds: string[]) =>
      fetch('/api/ironing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds }),
      }).then((r) => r.json()),
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

  // Salary calc: find items that were ironed (transitioned from pending_ironing to pending_qc)
  // For simplicity: count items with pending_qc or completed status that were updated recently
  const now = new Date()
  const filterByPeriod = (dateStr: string | null): boolean => {
    if (salaryPeriod === 'all') return true
    if (!dateStr) return false
    const diffDays = (now.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
    return salaryPeriod === 'week' ? diffDays <= 7 : diffDays <= 30
  }

  // Items that have been ironed = items with status pending_qc or completed (since they went through ironing)
  const ironedItems = allSewingTasks
    .filter((t: SewingTaskResponse) => filterByPeriod(t.updatedAt))
    .flatMap((t: SewingTaskResponse) =>
      t.items
        .filter((item: SewingTaskItemResponse) => item.status === 'pending_qc' || item.status === 'completed')
        .map((item: SewingTaskItemResponse) => ({
          ...item,
          taskUpdatedAt: t.updatedAt,
          taskPlanName: t.cuttingPlan?.plan?.name || '',
          sewerName: t.employee?.name || '',
        }))
    )

  const totalIronedUnits = ironedItems.reduce((sum: number, item: any) => sum + (item.actualQuantity || item.quantity), 0)
  const totalIroningSalary = totalIronedUnits * IRONING_RATE
  const periodLabel = salaryPeriod === 'week' ? 'за неделю' : salaryPeriod === 'month' ? 'за месяц' : 'за всё время'

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
              <div className="text-2xl font-bold text-purple-700">{totalIronedUnits} шт</div>
            </div>
            <div className="text-center p-3 bg-white/70 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Ставка</div>
              <div className="text-2xl font-bold text-purple-700">{IRONING_RATE} ₽/шт</div>
            </div>
            <div className="text-center p-3 bg-purple-100 rounded-lg border-2 border-purple-300 col-span-2 sm:col-span-1">
              <div className="text-xs text-purple-700 mb-1 font-medium">Итого зарплата</div>
              <div className="text-2xl font-bold text-purple-800">{totalIroningSalary.toLocaleString('ru-RU')} ₽</div>
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

// ============ TAB: Customer Materials ============
function CustomerMaterialsTab({ customerId }: { customerId: string }) {
  const { data: materials = [], isLoading, error } = useQuery({
    queryKey: ['material-balance', customerId],
    queryFn: async () => {
      const res = await fetch(`/api/material-balance?customerId=${customerId}`)
      if (res.status === 403) {
        throw new Error('access_denied')
      }
      return res.json()
    },
    enabled: !!customerId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <span className="ml-2 text-muted-foreground">Загрузка остатков...</span>
      </div>
    )
  }

  if (error && error.message === 'access_denied') {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">Доступ к остаткам материалов не открыт. Обратитесь к администратору.</p>
        </CardContent>
      </Card>
    )
  }

  if (!materials || materials.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">Нет данных по материалам</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left font-medium">Материал</th>
                <th className="p-3 text-left font-medium">Ед.</th>
                <th className="p-3 text-right font-medium">Остаток</th>
                <th className="p-3 text-right font-medium">Списано</th>
                <th className="p-3 text-right font-medium">Нормы расхода</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((mat: any) => (
                <tr key={mat.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{mat.name}</td>
                  <td className="p-3 text-muted-foreground">{mat.unit}</td>
                  <td className="p-3 text-right font-semibold">{mat.totalQty.toLocaleString('ru-RU')}</td>
                  <td className="p-3 text-right text-red-600">{mat.consumed.toLocaleString('ru-RU')}</td>
                  <td className="p-3 text-right">
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      {mat.norms.map((n: any, i: number) => (
                        <span key={i}>{n.productName}: {n.consumptionPerUnit} {n.unit}/шт</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
  const [newCustomerId, setNewCustomerId] = useState('')

  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editRole, setEditRole] = useState('sewer')
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => fetch('/api/employees').then((r) => r.json()),
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetch('/api/customers').then((r) => r.json()),
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
      setNewCustomerId('')
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
            {newRole === 'customer' && (
              <div className="space-y-2">
                <Label>Заказчик <span className="text-red-500">*</span></Label>
                <Select value={newCustomerId} onValueChange={setNewCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите заказчика" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c: { id: string; name: string }) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => createMutation.mutate({ name: newName, code: newCode, role: newRole, username: newUsername, password: newPassword, ...(newRole === 'customer' && newCustomerId ? { customerId: newCustomerId } : {}) })}
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

// ============ TAB 5: ИЗДЕЛИЯ ============
function ProductsTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [newName, setNewName] = useState('')
  const [newArticle, setNewArticle] = useState('')
  const [newSewerRate, setNewSewerRate] = useState('150')
  const [newHomeRate, setNewHomeRate] = useState('0')
  const [newQcRate, setNewQcRate] = useState('50')
  const [newReworkRate, setNewReworkRate] = useState('80')
  const [newIsKit, setNewIsKit] = useState(false)
  const [newKitComboColors, setNewKitComboColors] = useState<Record<string, string[]>>({})
  const [newKitKey, setNewKitKey] = useState('')
  const [newKitValue, setNewKitValue] = useState('')
  const [newSizes, setNewSizes] = useState<string[]>([])
  const [newSizeInput, setNewSizeInput] = useState('')
  const [newColors, setNewColors] = useState<Array<{ color: string; colorHex: string }>>([])
  const [newColorName, setNewColorName] = useState('')
  const [newColorHex, setNewColorHex] = useState('#9ca3af')
  const [newReworkReasons, setNewReworkReasons] = useState<string[]>([])
  const [newReasonInput, setNewReasonInput] = useState('')
  const [newIroningRate, setNewIroningRate] = useState('0')
  const [newCuttingRate, setNewCuttingRate] = useState('0')
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null)
  const [newImageFile, setNewImageFile] = useState<File | null>(null)
  const [editName, setEditName] = useState('')
  const [editArticle, setEditArticle] = useState('')
  const [editSewerRate, setEditSewerRate] = useState('150')
  const [editHomeRate, setEditHomeRate] = useState('0')
  const [editQcRate, setEditQcRate] = useState('50')
  const [editReworkRate, setEditReworkRate] = useState('80')
  const [editIsKit, setEditIsKit] = useState(false)
  const [editKitComboColors, setEditKitComboColors] = useState<Record<string, string[]>>({})
  const [editKitKey, setEditKitKey] = useState('')
  const [editKitValue, setEditKitValue] = useState('')
  const [editSizes, setEditSizes] = useState<string[]>([])
  const [editSizeInput, setEditSizeInput] = useState('')
  const [editColors, setEditColors] = useState<Array<{ color: string; colorHex: string }>>([])
  const [editColorName, setEditColorName] = useState('')
  const [editColorHex, setEditColorHex] = useState('#9ca3af')
  const [editReworkReasons, setEditReworkReasons] = useState<string[]>([])
  const [editReasonInput, setEditReasonInput] = useState('')
  const [editIroningRate, setEditIroningRate] = useState('0')
  const [editCuttingRate, setEditCuttingRate] = useState('0')
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [sizeRates, setSizeRates] = useState<Record<string, { sewerRate: string; homeRate: string; qcRate: string; ironingRate: string; cuttingRate: string }>>({})

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then((r) => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setCreateOpen(false); resetCreateForm(); toast({ title: 'Изделие создано' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось создать изделие', variant: 'destructive' }) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      fetch(`/api/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setEditOpen(false); setSelectedProduct(null); toast({ title: 'Изделие обновлено' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось обновить изделие', variant: 'destructive' }) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/products/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setDeleteOpen(false); setSelectedProduct(null); toast({ title: 'Изделие удалено' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить изделие', variant: 'destructive' }) },
  })

  const resetCreateForm = useCallback(() => {
    setNewName(''); setNewArticle(''); setNewSewerRate('150'); setNewHomeRate('0'); setNewQcRate('50'); setNewReworkRate('80'); setNewIroningRate('0'); setNewCuttingRate('0'); setNewIsKit(false); setNewKitComboColors({}); setNewKitKey(''); setNewKitValue(''); setNewSizes([]); setNewSizeInput(''); setNewColors([]); setNewColorName(''); setNewColorHex('#9ca3af'); setNewReworkReasons([]); setNewReasonInput(''); setNewImageUrl(null); setNewImageFile(null)
  }, [])

  const handleCreate = useCallback(() => {
    if (!newName.trim() || !newArticle.trim()) { toast({ title: 'Ошибка', description: 'Заполните название и артикул', variant: 'destructive' }); return }
    createMutation.mutate({ name: newName, article: newArticle, sewerRate: parseInt(newSewerRate) || 150, homeRate: parseInt(newHomeRate) || 0, qcRate: parseInt(newQcRate) || 50, reworkRate: parseInt(newReworkRate) || 80, ironingRate: parseInt(newIroningRate) || 0, cuttingRate: parseInt(newCuttingRate) || 0, isKit: newIsKit, kitComboColors: newIsKit ? newKitComboColors : null, sizes: newSizes, colors: newColors, imageUrl: newImageUrl })
  }, [newName, newArticle, newSewerRate, newHomeRate, newQcRate, newReworkRate, newIroningRate, newCuttingRate, newIsKit, newKitComboColors, newSizes, newColors, newImageUrl, createMutation, toast])

  const handleOpenEdit = useCallback((product: Product) => {
    let parsedKitComboColors: Record<string, string[]> = {}
    if (product.isKit && product.kitComboColors) {
      try {
        parsedKitComboColors = typeof product.kitComboColors === 'string' ? JSON.parse(product.kitComboColors) : (product.kitComboColors as Record<string, string[]>)
      } catch { parsedKitComboColors = {} }
    }
    setSelectedProduct(product); setEditName(product.name); setEditArticle(product.article); setEditSewerRate(String(product.sewerRate)); setEditHomeRate(String(product.homeRate)); setEditQcRate(String(product.qcRate)); setEditReworkRate(String(product.reworkRate)); setEditIroningRate(String(product.ironingRate ?? 0)); setEditCuttingRate(String(product.cuttingRate ?? 0)); setEditIsKit(product.isKit); setEditKitComboColors(parsedKitComboColors); setEditKitKey(''); setEditKitValue(''); setEditSizes(product.sizes.map((s) => s.size)); setEditSizeInput(''); setEditColors(product.colors.map((c) => ({ color: c.color, colorHex: c.colorHex }))); setEditColorName(''); setEditColorHex('#9ca3af'); setEditReworkReasons(product.reworkReasons.map((r) => r.text)); setEditReasonInput(''); setEditImageUrl(product.imageUrl || null); setEditImageFile(null); setSizeRates({}); setEditOpen(true)
    // Load size rates
    fetch(`/api/product-size-rates?productId=${product.id}`).then(r => r.json()).then((rates: Array<{ size: string; sewerRate: number | null; homeRate: number | null; qcRate: number | null; ironingRate: number | null; cuttingRate: number | null }>) => {
      const r: Record<string, { sewerRate: string; homeRate: string; qcRate: string; ironingRate: string; cuttingRate: string }> = {}
      rates.forEach(s => { r[s.size] = { sewerRate: String(s.sewerRate ?? ''), homeRate: String(s.homeRate ?? ''), qcRate: String(s.qcRate ?? ''), ironingRate: String(s.ironingRate ?? ''), cuttingRate: String(s.cuttingRate ?? '') } })
      setSizeRates(r)
    }).catch(() => {})
  }, [])

  const handleUpdate = useCallback(() => {
    if (!selectedProduct || !editName.trim() || !editArticle.trim()) { toast({ title: 'Ошибка', description: 'Заполните название и артикул', variant: 'destructive' }); return }
    updateMutation.mutate({ id: selectedProduct.id, data: { name: editName, article: editArticle, sewerRate: parseInt(editSewerRate) || 150, homeRate: parseInt(editHomeRate) || 0, qcRate: parseInt(editQcRate) || 50, reworkRate: parseInt(editReworkRate) || 80, ironingRate: parseInt(editIroningRate) || 0, cuttingRate: parseInt(editCuttingRate) || 0, isKit: editIsKit, kitComboColors: editIsKit ? editKitComboColors : null, sizes: editSizes, colors: editColors, imageUrl: editImageUrl } })
    // Save size rates
    const ratesToSave = Object.entries(sizeRates).filter(([, v]) => v.sewerRate !== '' || v.homeRate !== '' || v.qcRate !== '' || v.ironingRate !== '' || v.cuttingRate !== '').map(([size, v]) => ({
      productId: selectedProduct.id,
      size,
      sewerRate: v.sewerRate ? parseInt(v.sewerRate) : null,
      homeRate: v.homeRate ? parseInt(v.homeRate) : null,
      qcRate: v.qcRate ? parseInt(v.qcRate) : null,
      ironingRate: v.ironingRate ? parseInt(v.ironingRate) : null,
      cuttingRate: v.cuttingRate ? parseInt(v.cuttingRate) : null,
    }))
    if (ratesToSave.length > 0) {
      fetch('/api/product-size-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rates: ratesToSave }) }).catch(() => {})
    }
  }, [selectedProduct, editName, editArticle, editSewerRate, editHomeRate, editQcRate, editReworkRate, editIroningRate, editCuttingRate, editIsKit, editKitComboColors, editSizes, editColors, editImageUrl, sizeRates, updateMutation, toast])

  if (isLoading) { return (<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /><span className="ml-2 text-muted-foreground">Загрузка...</span></div>) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Изделия</h2>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { resetCreateForm(); setCreateOpen(true) }}><Plus className="h-4 w-4 mr-1" />Добавить изделие</Button>
      </div>
      {products.length === 0 ? (
        <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Package className="h-12 w-12 mb-3 opacity-30" /><p>Нет изделий в справочнике</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product: Product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-10 w-10 rounded object-cover border" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center"><Camera className="h-4 w-4 text-gray-400" /></div>
                    )}
                    <div><CardTitle className="text-base">{product.name}</CardTitle><CardDescription className="text-xs">{product.article}</CardDescription></div>
                  </div>
                  {product.isKit && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">ч/б</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Швея:</span> {product.sewerRate} ₽</div>
                  <div><span className="text-muted-foreground">Дома:</span> {product.homeRate} ₽</div>
                  <div><span className="text-muted-foreground">ОТК:</span> {product.qcRate} ₽</div>
                  <div><span className="text-muted-foreground">Перед.:</span> {product.reworkRate} ₽</div>
                  <div><span className="text-muted-foreground">ВТО:</span> {product.ironingRate ?? 0} ₽</div>
                  <div><span className="text-muted-foreground">Крой:</span> {product.cuttingRate ?? 0} ₽</div>
                </div>
                {product.sizes.length > 0 && (<div className="flex flex-wrap gap-1">{product.sizes.map((s) => (<Badge key={s.id} variant="outline" className="text-xs">{s.size}</Badge>))}</div>)}
                {product.colors.length > 0 && (<div className="flex flex-wrap gap-1">{product.colors.map((c) => (<Badge key={c.id} variant="outline" className="text-xs">{getColorDot(c.colorHex)}{c.color}</Badge>))}</div>)}
                {product.reworkReasons.length > 0 && (<div className="text-xs text-muted-foreground">Переделки: {product.reworkReasons.map((r) => r.text).join(', ')}</div>)}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={() => handleOpenEdit(product)}><Pencil className="h-4 w-4 mr-1" />Изменить</Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[44px]" onClick={() => { setSelectedProduct(product); setDeleteOpen(true) }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Product Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Новое изделие</DialogTitle><DialogDescription>Заполните данные изделия</DialogDescription></DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Название</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Футболка" /></div>
                <div className="space-y-2"><Label>Артикул</Label><Input value={newArticle} onChange={(e) => setNewArticle(e.target.value)} placeholder="ФК-001" /></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-2"><Label>Швея, ₽</Label><Input type="number" min="0" value={newSewerRate} onChange={(e) => setNewSewerRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Дома, ₽</Label><Input type="number" min="0" value={newHomeRate} onChange={(e) => setNewHomeRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>ОТК, ₽</Label><Input type="number" min="0" value={newQcRate} onChange={(e) => setNewQcRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Переделка, ₽</Label><Input type="number" min="0" value={newReworkRate} onChange={(e) => setNewReworkRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>ВТО, ₽</Label><Input type="number" min="0" value={newIroningRate} onChange={(e) => setNewIroningRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Крой, ₽</Label><Input type="number" min="0" value={newCuttingRate} onChange={(e) => setNewCuttingRate(e.target.value)} /></div>
              </div>
              {/* Image upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Фото изделия</Label>
                <div className="flex items-center gap-3">
                  {newImageUrl ? (
                    <div className="relative">
                      <img src={newImageUrl} alt="preview" className="h-16 w-16 rounded object-cover border" />
                      <Button size="sm" variant="ghost" className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-white rounded-full border" onClick={() => { setNewImageUrl(null); setNewImageFile(null) }}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <label className="h-16 w-16 rounded border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-emerald-400 transition-colors">
                      <Camera className="h-5 w-5 text-gray-400" />
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setNewImageFile(file)
                        const fd = new FormData(); fd.append('file', file)
                        try { const res = await fetch('/api/upload', { method: 'POST', body: fd }); const data = await res.json(); if (data.url) setNewImageUrl(data.url) } catch { toast({ title: 'Ошибка', description: 'Не удалось загрузить фото', variant: 'destructive' }) }
                      }} />
                    </label>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Checkbox id="newIsKit" checked={newIsKit} onCheckedChange={(c) => setNewIsKit(c === true)} /><Label htmlFor="newIsKit" className="cursor-pointer">Комплект</Label></div>
                {newIsKit && (
                  <div className="space-y-2 border rounded-lg p-3 bg-amber-50/50">
                    <p className="text-xs text-muted-foreground">Например: &quot;ч/б&quot; → [чёрный, белый]. Комбо-цвет разворачивается в плане раскроя.</p>
                    {Object.entries(newKitComboColors).map(([key, values]) => (
                      <div key={key} className="flex items-center gap-2 bg-white rounded-md px-3 py-1.5 border text-sm">
                        <span className="font-medium">{key}</span><span className="text-muted-foreground">→</span><span>[{values.join(', ')}]</span>
                        <Button size="sm" variant="ghost" className="text-red-500 ml-auto p-0 h-auto" onClick={() => setNewKitComboColors(prev => { const n = { ...prev }; delete n[key]; return n })}><X className="h-3 w-3" /></Button>
                      </div>
                    ))}
                    <div className="flex gap-2 items-end">
                      <div className="w-20"><Label className="text-xs text-muted-foreground">Код</Label><Input value={newKitKey} onChange={(e) => setNewKitKey(e.target.value)} placeholder="ч/б" /></div>
                      <div className="flex-1"><Label className="text-xs text-muted-foreground">Цвета (через запятую)</Label><Input value={newKitValue} onChange={(e) => setNewKitValue(e.target.value)} placeholder="чёрный, белый" onKeyDown={(e) => { if (e.key === 'Enter' && newKitKey.trim()) { setNewKitComboColors(prev => ({ ...prev, [newKitKey.trim()]: newKitValue.trim() ? newKitValue.split(',').map(v => v.trim()).filter(Boolean) : [] })); setNewKitKey(''); setNewKitValue('') } }} /></div>
                      <Button size="sm" variant="outline" onClick={() => { if (newKitKey.trim()) { setNewKitComboColors(prev => ({ ...prev, [newKitKey.trim()]: newKitValue.trim() ? newKitValue.split(',').map(v => v.trim()).filter(Boolean) : [] })); setNewKitKey(''); setNewKitValue('') } }}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Размеры</Label>
                <div className="flex flex-wrap gap-1 mb-2">{newSizes.map((s, i) => (<Badge key={i} variant="secondary" className="gap-1">{s}<X className="h-3 w-3 cursor-pointer" onClick={() => setNewSizes((prev) => prev.filter((_, j) => j !== i))} /></Badge>))}</div>
                <div className="flex gap-2"><Input value={newSizeInput} onChange={(e) => setNewSizeInput(e.target.value)} placeholder="S, M, L..." onKeyDown={(e) => { if (e.key === 'Enter' && newSizeInput.trim()) { setNewSizes((prev) => [...prev, newSizeInput.trim()]); setNewSizeInput('') } }} /><Button size="sm" variant="outline" onClick={() => { if (newSizeInput.trim()) { setNewSizes((prev) => [...prev, newSizeInput.trim()]); setNewSizeInput('') } }}><Plus className="h-4 w-4" /></Button></div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Цвета</Label>
                <div className="flex flex-wrap gap-1 mb-2">{newColors.map((c, i) => (<Badge key={i} variant="secondary" className="gap-1">{getColorDot(c.colorHex)}{c.color}<X className="h-3 w-3 cursor-pointer" onClick={() => setNewColors((prev) => prev.filter((_, j) => j !== i))} /></Badge>))}</div>
                <div className="flex gap-2 items-end"><div className="flex-1"><Input value={newColorName} onChange={(e) => setNewColorName(e.target.value)} placeholder="Название цвета" /></div><input type="color" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)} className="w-10 h-10 rounded cursor-pointer border p-0" /><Button size="sm" variant="outline" onClick={() => { if (newColorName.trim()) { setNewColors((prev) => [...prev, { color: newColorName.trim(), colorHex: newColorHex }]); setNewColorName(''); setNewColorHex('#9ca3af') } }}><Plus className="h-4 w-4" /></Button></div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Причины переделок</Label>
                <div className="flex flex-wrap gap-1 mb-2">{newReworkReasons.map((r, i) => (<Badge key={i} variant="secondary" className="gap-1">{r}<X className="h-3 w-3 cursor-pointer" onClick={() => setNewReworkReasons((prev) => prev.filter((_, j) => j !== i))} /></Badge>))}</div>
                <div className="flex gap-2"><Input value={newReasonInput} onChange={(e) => setNewReasonInput(e.target.value)} placeholder="Кривой шов..." onKeyDown={(e) => { if (e.key === 'Enter' && newReasonInput.trim()) { setNewReworkReasons((prev) => [...prev, newReasonInput.trim()]); setNewReasonInput('') } }} /><Button size="sm" variant="outline" onClick={() => { if (newReasonInput.trim()) { setNewReworkReasons((prev) => [...prev, newReasonInput.trim()]); setNewReasonInput('') } }}><Plus className="h-4 w-4" /></Button></div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Редактировать изделие</DialogTitle><DialogDescription>Измените данные изделия</DialogDescription></DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Название</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Артикул</Label><Input value={editArticle} onChange={(e) => setEditArticle(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-2"><Label>Швея, ₽</Label><Input type="number" min="0" value={editSewerRate} onChange={(e) => setEditSewerRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Дома, ₽</Label><Input type="number" min="0" value={editHomeRate} onChange={(e) => setEditHomeRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>ОТК, ₽</Label><Input type="number" min="0" value={editQcRate} onChange={(e) => setEditQcRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Переделка, ₽</Label><Input type="number" min="0" value={editReworkRate} onChange={(e) => setEditReworkRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>ВТО, ₽</Label><Input type="number" min="0" value={editIroningRate} onChange={(e) => setEditIroningRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Крой, ₽</Label><Input type="number" min="0" value={editCuttingRate} onChange={(e) => setEditCuttingRate(e.target.value)} /></div>
              </div>
              {/* Image upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Фото изделия</Label>
                <div className="flex items-center gap-3">
                  {editImageUrl ? (
                    <div className="relative">
                      <img src={editImageUrl} alt="preview" className="h-16 w-16 rounded object-cover border" />
                      <Button size="sm" variant="ghost" className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-white rounded-full border" onClick={() => { setEditImageUrl(null); setEditImageFile(null) }}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <label className="h-16 w-16 rounded border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-emerald-400 transition-colors">
                      <Camera className="h-5 w-5 text-gray-400" />
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setEditImageFile(file)
                        const fd = new FormData(); fd.append('file', file)
                        try { const res = await fetch('/api/upload', { method: 'POST', body: fd }); const data = await res.json(); if (data.url) setEditImageUrl(data.url) } catch { toast({ title: 'Ошибка', description: 'Не удалось загрузить фото', variant: 'destructive' }) }
                      }} />
                    </label>
                  )}
                </div>
              </div>
              {/* Size rates */}
              {editSizes.length > 0 && selectedProduct && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Нормы по размерам</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs h-8">Размер</TableHead>
                          <TableHead className="text-xs h-8">Швея</TableHead>
                          <TableHead className="text-xs h-8">Дома</TableHead>
                          <TableHead className="text-xs h-8">ОТК</TableHead>
                          <TableHead className="text-xs h-8">ВТО</TableHead>
                          <TableHead className="text-xs h-8">Крой</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editSizes.map((size) => {
                          const sr = sizeRates[size] || { sewerRate: '', homeRate: '', qcRate: '', ironingRate: '', cuttingRate: '' }
                          const isOverridden = sr.sewerRate !== '' || sr.homeRate !== '' || sr.qcRate !== '' || sr.ironingRate !== '' || sr.cuttingRate !== ''
                          return (
                            <TableRow key={size} className={isOverridden ? 'bg-emerald-50' : ''}>
                              <TableCell className="text-xs font-medium">{size}</TableCell>
                              <TableCell className="p-1"><Input type="number" min="0" className="h-7 text-xs" placeholder={`(${editSewerRate})`} value={sr.sewerRate} onChange={(e) => setSizeRates(prev => ({ ...prev, [size]: { ...prev[size] || { sewerRate: '', homeRate: '', qcRate: '', ironingRate: '', cuttingRate: '' }, sewerRate: e.target.value } }))} /></TableCell>
                              <TableCell className="p-1"><Input type="number" min="0" className="h-7 text-xs" placeholder={`(${editHomeRate})`} value={sr.homeRate} onChange={(e) => setSizeRates(prev => ({ ...prev, [size]: { ...prev[size] || { sewerRate: '', homeRate: '', qcRate: '', ironingRate: '', cuttingRate: '' }, homeRate: e.target.value } }))} /></TableCell>
                              <TableCell className="p-1"><Input type="number" min="0" className="h-7 text-xs" placeholder={`(${editQcRate})`} value={sr.qcRate} onChange={(e) => setSizeRates(prev => ({ ...prev, [size]: { ...prev[size] || { sewerRate: '', homeRate: '', qcRate: '', ironingRate: '', cuttingRate: '' }, qcRate: e.target.value } }))} /></TableCell>
                              <TableCell className="p-1"><Input type="number" min="0" className="h-7 text-xs" placeholder={`(${editIroningRate})`} value={sr.ironingRate} onChange={(e) => setSizeRates(prev => ({ ...prev, [size]: { ...prev[size] || { sewerRate: '', homeRate: '', qcRate: '', ironingRate: '', cuttingRate: '' }, ironingRate: e.target.value } }))} /></TableCell>
                              <TableCell className="p-1"><Input type="number" min="0" className="h-7 text-xs" placeholder={`(${editCuttingRate})`} value={sr.cuttingRate} onChange={(e) => setSizeRates(prev => ({ ...prev, [size]: { ...prev[size] || { sewerRate: '', homeRate: '', qcRate: '', ironingRate: '', cuttingRate: '' }, cuttingRate: e.target.value } }))} /></TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-muted-foreground">Пустое поле = базовая ставка изделия. Заполненное = переопределение для размера.</p>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Checkbox id="editIsKit" checked={editIsKit} onCheckedChange={(c) => setEditIsKit(c === true)} /><Label htmlFor="editIsKit" className="cursor-pointer">Комплект</Label></div>
                {editIsKit && (
                  <div className="space-y-2 border rounded-lg p-3 bg-amber-50/50">
                    <p className="text-xs text-muted-foreground">Например: &quot;ч/б&quot; → [чёрный, белый]. Комбо-цвет разворачивается в плане раскроя.</p>
                    {Object.entries(editKitComboColors).map(([key, values]) => (
                      <div key={key} className="flex items-center gap-2 bg-white rounded-md px-3 py-1.5 border text-sm">
                        <span className="font-medium">{key}</span><span className="text-muted-foreground">→</span><span>[{values.join(', ')}]</span>
                        <Button size="sm" variant="ghost" className="text-red-500 ml-auto p-0 h-auto" onClick={() => setEditKitComboColors(prev => { const n = { ...prev }; delete n[key]; return n })}><X className="h-3 w-3" /></Button>
                      </div>
                    ))}
                    <div className="flex gap-2 items-end">
                      <div className="w-20"><Label className="text-xs text-muted-foreground">Код</Label><Input value={editKitKey} onChange={(e) => setEditKitKey(e.target.value)} placeholder="ч/б" /></div>
                      <div className="flex-1"><Label className="text-xs text-muted-foreground">Цвета (через запятую)</Label><Input value={editKitValue} onChange={(e) => setEditKitValue(e.target.value)} placeholder="чёрный, белый" onKeyDown={(e) => { if (e.key === 'Enter' && editKitKey.trim()) { setEditKitComboColors(prev => ({ ...prev, [editKitKey.trim()]: editKitValue.trim() ? editKitValue.split(',').map(v => v.trim()).filter(Boolean) : [] })); setEditKitKey(''); setEditKitValue('') } }} /></div>
                      <Button size="sm" variant="outline" onClick={() => { if (editKitKey.trim()) { setEditKitComboColors(prev => ({ ...prev, [editKitKey.trim()]: editKitValue.trim() ? editKitValue.split(',').map(v => v.trim()).filter(Boolean) : [] })); setEditKitKey(''); setEditKitValue('') } }}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Размеры</Label>
                <div className="flex flex-wrap gap-1 mb-2">{editSizes.map((s, i) => (<Badge key={i} variant="secondary" className="gap-1">{s}<X className="h-3 w-3 cursor-pointer" onClick={() => setEditSizes((prev) => prev.filter((_, j) => j !== i))} /></Badge>))}</div>
                <div className="flex gap-2"><Input value={editSizeInput} onChange={(e) => setEditSizeInput(e.target.value)} placeholder="S, M, L..." onKeyDown={(e) => { if (e.key === 'Enter' && editSizeInput.trim()) { setEditSizes((prev) => [...prev, editSizeInput.trim()]); setEditSizeInput('') } }} /><Button size="sm" variant="outline" onClick={() => { if (editSizeInput.trim()) { setEditSizes((prev) => [...prev, editSizeInput.trim()]); setEditSizeInput('') } }}><Plus className="h-4 w-4" /></Button></div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Цвета</Label>
                <div className="flex flex-wrap gap-1 mb-2">{editColors.map((c, i) => (<Badge key={i} variant="secondary" className="gap-1">{getColorDot(c.colorHex)}{c.color}<X className="h-3 w-3 cursor-pointer" onClick={() => setEditColors((prev) => prev.filter((_, j) => j !== i))} /></Badge>))}</div>
                <div className="flex gap-2 items-end"><div className="flex-1"><Input value={editColorName} onChange={(e) => setEditColorName(e.target.value)} placeholder="Название цвета" /></div><input type="color" value={editColorHex} onChange={(e) => setEditColorHex(e.target.value)} className="w-10 h-10 rounded cursor-pointer border p-0" /><Button size="sm" variant="outline" onClick={() => { if (editColorName.trim()) { setEditColors((prev) => [...prev, { color: editColorName.trim(), colorHex: editColorHex }]); setEditColorName(''); setEditColorHex('#9ca3af') } }}><Plus className="h-4 w-4" /></Button></div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Причины переделок</Label>
                <div className="flex flex-wrap gap-1 mb-2">{editReworkReasons.map((r, i) => (<Badge key={i} variant="secondary" className="gap-1">{r}<X className="h-3 w-3 cursor-pointer" onClick={() => setEditReworkReasons((prev) => prev.filter((_, j) => j !== i))} /></Badge>))}</div>
                <div className="flex gap-2"><Input value={editReasonInput} onChange={(e) => setEditReasonInput(e.target.value)} placeholder="Кривой шов..." onKeyDown={(e) => { if (e.key === 'Enter' && editReasonInput.trim()) { setEditReworkReasons((prev) => [...prev, editReasonInput.trim()]); setEditReasonInput('') } }} /><Button size="sm" variant="outline" onClick={() => { if (editReasonInput.trim()) { setEditReworkReasons((prev) => [...prev, editReasonInput.trim()]); setEditReasonInput('') } }}><Plus className="h-4 w-4" /></Button></div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleUpdate} disabled={updateMutation.isPending}>{updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Удалить изделие?</AlertDialogTitle><AlertDialogDescription>Это действие нельзя отменить. Изделие &laquo;{selectedProduct?.name}&raquo; будет удалено навсегда.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => selectedProduct && deleteMutation.mutate(selectedProduct.id)}>Удалить</AlertDialogAction>
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

  // Technologist, Cutter: stub
  if (userRole === 'technologist' || userRole === 'cutter') {
    const RoleIcon = userRole === 'technologist' ? FlaskConical : Scissors
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

  // Ironing: dedicated IroningTab
  if (userRole === 'ironing') {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div><h1 className="text-2xl font-bold text-gray-900">{user.name}</h1><p className="text-sm text-muted-foreground">{getRoleLabel(userRole)}</p></div>
            <Button variant="outline" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Выйти</Button>
          </div>
          <IroningTab />
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

  // Customer: only their own plans, cities, and boxes
  if (userRole === 'customer') {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-sm text-muted-foreground">Личный кабинет заказчика</p>
            </div>
            <Button variant="outline" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" />Выйти</Button>
          </div>
          <Tabs defaultValue="plans" className="w-full">
            <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="plans" className="gap-1.5"><FileText className="h-4 w-4" /><span className="hidden sm:inline">Планы пошива</span><span className="sm:hidden">Планы</span></TabsTrigger>
              <TabsTrigger value="distribution" className="gap-1.5"><MapPin className="h-4 w-4" /><span className="hidden sm:inline">Города</span><span className="sm:hidden">Города</span></TabsTrigger>
              <TabsTrigger value="boxes" className="gap-1.5"><Box className="h-4 w-4" /><span className="hidden sm:inline">Короба</span><span className="sm:hidden">Короба</span></TabsTrigger>
              <TabsTrigger value="materials" className="gap-1.5"><Package className="h-4 w-4" /><span className="hidden sm:inline">Материалы</span><span className="sm:hidden">Мат.</span></TabsTrigger>
            </TabsList>
            <TabsContent value="plans" className="mt-6"><SewingPlansTab /></TabsContent>
            <TabsContent value="distribution" className="mt-6"><CityDistributionTab /></TabsContent>
            <TabsContent value="boxes" className="mt-6"><BoxesTab /></TabsContent>
            <TabsContent value="materials" className="mt-6"><CustomerMaterialsTab customerId={user.customerId!} /></TabsContent>
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
            <TabsTrigger value="leftovers" className="gap-1.5"><AlertTriangle className="h-4 w-4" /><span className="hidden sm:inline">Остатки</span><span className="sm:hidden">Остатки</span></TabsTrigger>
            <TabsTrigger value="sewing-tasks" className="gap-1.5"><ListTodo className="h-4 w-4" /><span className="hidden sm:inline">Задания швеям</span><span className="sm:hidden">Задания</span></TabsTrigger>
            <TabsTrigger value="sewers" className="gap-1.5"><Scissors className="h-4 w-4" /><span className="hidden sm:inline">Швеи</span><span className="sm:hidden">Швеи</span></TabsTrigger>
            <TabsTrigger value="qc" className="gap-1.5"><ClipboardCheck className="h-4 w-4" /><span className="hidden sm:inline">ОТК</span><span className="sm:hidden">ОТК</span></TabsTrigger>
            <TabsTrigger value="ironing" className="gap-1.5"><Heater className="h-4 w-4" /><span className="hidden sm:inline">ВТО</span><span className="sm:hidden">ВТО</span></TabsTrigger>
            <TabsTrigger value="distribution" className="gap-1.5"><MapPin className="h-4 w-4" /><span className="hidden sm:inline">Города</span><span className="sm:hidden">Города</span></TabsTrigger>
            <TabsTrigger value="boxes" className="gap-1.5"><Box className="h-4 w-4" /><span className="hidden sm:inline">Короба</span><span className="sm:hidden">Короба</span></TabsTrigger>
            <TabsTrigger value="products" className="gap-1.5"><Package className="h-4 w-4" /><span className="hidden sm:inline">Изделия</span><span className="sm:hidden">Изделия</span></TabsTrigger>
            <TabsTrigger value="employees" className="gap-1.5"><Users className="h-4 w-4" /><span className="hidden sm:inline">Сотрудники</span><span className="sm:hidden">Сотрудники</span></TabsTrigger>
            <TabsTrigger value="references" className="gap-1.5"><BookOpen className="h-4 w-4" /><span className="hidden sm:inline">Справочники</span><span className="sm:hidden">Справ.</span></TabsTrigger>
          </TabsList>
          <TabsContent value="plans" className="mt-6"><SewingPlansTab /></TabsContent>
          <TabsContent value="cutting" className="mt-6"><CuttingPlansTab /></TabsContent>
          <TabsContent value="leftovers" className="mt-6"><CuttingLeftoversTab /></TabsContent>
          <TabsContent value="sewing-tasks" className="mt-6"><SewingTasksTab /></TabsContent>
          <TabsContent value="sewers" className="mt-6"><SewerTab /></TabsContent>
          <TabsContent value="qc" className="mt-6"><QCTab /></TabsContent>
          <TabsContent value="ironing" className="mt-6"><IroningTab /></TabsContent>
          <TabsContent value="distribution" className="mt-6"><CityDistributionTab /></TabsContent>
          <TabsContent value="boxes" className="mt-6"><BoxesTab /></TabsContent>
          <TabsContent value="products" className="mt-6"><ProductsTab /></TabsContent>
          <TabsContent value="employees" className="mt-6"><EmployeesTab /></TabsContent>
          <TabsContent value="references" className="mt-6"><ReferencesTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  )
}