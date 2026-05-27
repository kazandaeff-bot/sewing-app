'use client'

import { useState, useCallback, useMemo, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  Scissors,
  ClipboardList,
  Package,
  Truck,
  FileText,
  Printer,
  X,
  Play,
  Ship,
  Banknote,
  BookOpen,
  MapPin,
  Pencil,
  AlertTriangle,
  Users,
  Palette,
  Grid3X3,
  Store,
  ChevronDown,
  ChevronUp,
  Boxes,
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

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

// ============ Inline Types ============
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
  sewerRate: number
  homeRate: number
  qcRate: number
  reworkRate: number
  isKit: boolean
  kitComboColors: Record<string, string[]> | null
  sizes: ProductSize[]
  colors: ProductColor[]
}

interface Employee {
  id: string
  name: string
  code: string
  username: string
  password: string
  role: string
  customerId?: string | null
  customer?: { id: string; name: string } | null
}

interface PlanItem {
  id: string
  productId: string
  size: string
  color: string
  colorHex: string
  quantity: number
  product: Product
}

interface Plan {
  id: string
  name: string
  status: string
  items: PlanItem[]
  cuttingPlan: CuttingPlan | null
  createdAt: string
}

interface CuttingPlanItem {
  id: string
  productId: string
  size: string
  color: string
  colorHex: string
  plannedQty: number
  actualQty: number | null
  product: Product
}

interface CuttingPlan {
  id: string
  planId: string
  status: string
  items: CuttingPlanItem[]
  sewingTasks: SewingTaskBrief[]
  plan: { id: string; name: string }
  createdAt: string
}

interface SewingTaskBrief {
  id: string
  employeeId: string
  status: string
  employee: Employee
}

interface SewingTaskItem {
  id: string
  productId: string
  size: string
  color: string
  colorHex: string
  quantity: number
  product: Product
}

interface SewingTask {
  id: string
  cuttingPlanId: string
  employeeId: string
  status: string
  items: SewingTaskItem[]
  cuttingPlan: { id: string; plan: { id: string; name: string } }
  employee: Employee
  createdAt: string
}

interface SellerPlanCity {
  id: string
  city: string
  quantity: number
}

interface SellerPlanItem {
  id: string
  productId: string
  size: string
  color: string
  colorHex: string
  quantity: number
  product: Product
  cities: SellerPlanCity[]
}

interface SellerPlan {
  id: string
  sellerName: string
  status: string
  items: SellerPlanItem[]
  boxes: Box[]
  createdAt: string
}

interface BoxItem {
  id: string
  productId: string
  size: string
  color: string
  colorHex: string
  plannedQty: number
  actualQty: number | null
  product: Product
}

interface Box {
  id: string
  sellerPlanId: string
  boxNumber: number
  city: string
  status: string
  items: BoxItem[]
  sellerPlan: { id: string; sellerName: string }
  createdAt: string
}

// ============ Helpers ============
function parseKitComboColors(raw: string | Record<string, string[]> | null | undefined): Record<string, string[]> {
  if (!raw) return {}
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch { return {} }
}

function getKitLabel(p: Product): string {
  if (!p.isKit) return ''
  const kit = parseKitComboColors(p.kitComboColors)
  const keys = Object.keys(kit)
  return keys.length > 0 ? ` [${keys.join(', ')}]` : ' [комплект]'
}

function getColorDot(colorHex: string) {
  return (
    <span
      style={{ backgroundColor: colorHex || '#9ca3af' }}
      className="inline-block w-3 h-3 rounded-full mr-1.5 align-middle border border-gray-200"
    />
  )
}

function getPlanStatusBadge(status: string) {
  switch (status) {
    case 'draft':
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">Черновик</Badge>
    case 'approved':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Утверждён</Badge>
    case 'in_work':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">В работе</Badge>
    case 'shipped':
      return <Badge variant="secondary" className="bg-sky-100 text-sky-700 hover:bg-sky-100">Отгружен</Badge>
    case 'shipped_paid':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-bold">Отгружен и оплачен</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getCuttingStatusBadge(status: string) {
  switch (status) {
    case 'in_work':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">В работе</Badge>
    case 'cut':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Раскроено</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getSewingTaskStatusBadge(status: string) {
  switch (status) {
    case 'issued':
      return <Badge variant="secondary" className="bg-sky-100 text-sky-700 hover:bg-sky-100">Выдано</Badge>
    case 'in_work':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">В работе</Badge>
    case 'done':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Готово</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function getBoxStatusBadge(status: string) {
  switch (status) {
    case 'forming':
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">Формируется</Badge>
    case 'assembled':
      return <Badge variant="secondary" className="bg-sky-100 text-sky-700 hover:bg-sky-100">Собран</Badge>
    case 'checked':
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">Проверен</Badge>
    case 'shipped':
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Отгружён</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

// ============ Tab 1: План пошива ============
export function SewingPlansTab({ customerId }: { customerId?: string | null } = {}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [planName, setPlanName] = useState('')
  const [planItems, setPlanItems] = useState<Array<{
    productId: string
    size: string
    color: string
    colorHex: string
    quantity: number
  }>>([{ productId: '', size: '', color: '', colorHex: '#9ca3af', quantity: 0 }])

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [editingPlanName, setEditingPlanName] = useState('')
  const [editingPlanStatus, setEditingPlanStatus] = useState('')
  const [editPlanItems, setEditPlanItems] = useState<Array<{
    id?: string
    productId: string
    size: string
    color: string
    colorHex: string
    quantity: number
  }>>([])

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans', customerId],
    queryFn: () => {
      const params = customerId ? `?customerId=${customerId}` : ''
      return fetch(`/api/plans${params}`).then((r) => r.json())
    },
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then((r) => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; items: Array<{ productId: string; size: string; color: string; colorHex: string; quantity: number }> }) =>
      fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setCreateDialogOpen(false)
      setPlanName('')
      setPlanItems([{ productId: '', size: '', color: '', colorHex: '#9ca3af', quantity: 0 }])
      toast({ title: 'План создан', description: 'Новый план пошива создан' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось создать план', variant: 'destructive' })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.invalidateQueries({ queryKey: ['cutting-plans'] })
      toast({ title: 'Статус обновлён' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить статус', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/plans/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast({ title: 'План удалён', description: 'План пошива удалён' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось удалить план', variant: 'destructive' })
    },
  })

  const updatePlanItemsMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; items: Array<{ productId: string; size: string; color: string; colorHex: string; quantity: number }> } }) =>
      fetch(`/api/plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.invalidateQueries({ queryKey: ['cutting-plans'] })
      setEditDialogOpen(false)
      toast({ title: 'План обновлён' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить план', variant: 'destructive' })
    },
  })

  const handleCreate = useCallback(() => {
    if (!planName.trim()) {
      toast({ title: 'Ошибка', description: 'Укажите название плана', variant: 'destructive' })
      return
    }
    const validItems = planItems.filter((i) => i.productId && i.size && i.color && i.quantity > 0)
    if (validItems.length === 0) {
      toast({ title: 'Ошибка', description: 'Добавьте хотя бы одну позицию', variant: 'destructive' })
      return
    }
    createMutation.mutate({ name: planName, items: validItems })
  }, [planName, planItems, createMutation, toast])

  const addPlanItemRow = useCallback(() => {
    setPlanItems((prev) => [...prev, { productId: '', size: '', color: '', colorHex: '#9ca3af', quantity: 0 }])
  }, [])

  const removePlanItemRow = useCallback((index: number) => {
    setPlanItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updatePlanItem = useCallback((index: number, field: string, value: string | number) => {
    setPlanItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }, [])

  const handleProductChange = useCallback((index: number, productId: string) => {
    setPlanItems(prev => prev.map((item, i) =>
      i === index ? { ...item, productId, size: '', color: '', colorHex: '#9ca3af' } : item
    ))
  }, [])

  const handleColorSelect = useCallback((index: number, colorValue: string, selectedProduct: Product | undefined) => {
    if (!selectedProduct) return
    const kitCombo = parseKitComboColors(selectedProduct.kitComboColors)
    if (selectedProduct.isKit && kitCombo[colorValue]) {
      // Color value is a kit combo key (e.g. "ч/б", "к/с")
      setPlanItems(prev => prev.map((item, i) =>
        i === index ? { ...item, color: colorValue, colorHex: '#808080' } : item
      ))
    } else {
      const colorObj = selectedProduct.colors.find(c => c.color === colorValue)
      setPlanItems(prev => prev.map((item, i) =>
        i === index ? { ...item, color: colorValue, colorHex: colorObj?.colorHex || '#9ca3af' } : item
      ))
    }
  }, [])

  // Edit plan helpers
  const openEditPlan = useCallback((plan: Plan) => {
    setEditingPlanId(plan.id)
    setEditingPlanName(plan.name)
    setEditingPlanStatus(plan.status)
    setEditPlanItems(plan.items.map(item => ({
      id: item.id,
      productId: item.productId,
      size: item.size,
      color: item.color,
      colorHex: item.colorHex,
      quantity: item.quantity,
    })))
    setEditDialogOpen(true)
  }, [])

  const addEditPlanItemRow = useCallback(() => {
    setEditPlanItems((prev) => [...prev, { productId: '', size: '', color: '', colorHex: '#9ca3af', quantity: 0 }])
  }, [])

  const removeEditPlanItemRow = useCallback((index: number) => {
    setEditPlanItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateEditPlanItem = useCallback((index: number, field: string, value: string | number) => {
    setEditPlanItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }, [])

  const handleEditProductChange = useCallback((index: number, productId: string) => {
    setEditPlanItems(prev => prev.map((item, i) =>
      i === index ? { ...item, productId, size: '', color: '', colorHex: '#9ca3af' } : item
    ))
  }, [])

  const handleEditColorSelect = useCallback((index: number, colorValue: string, selectedProduct: Product | undefined) => {
    if (!selectedProduct) return
    const kitCombo = parseKitComboColors(selectedProduct.kitComboColors)
    if (selectedProduct.isKit && kitCombo[colorValue]) {
      setEditPlanItems(prev => prev.map((item, i) =>
        i === index ? { ...item, color: colorValue, colorHex: '#808080' } : item
      ))
    } else {
      const colorObj = selectedProduct.colors.find(c => c.color === colorValue)
      setEditPlanItems(prev => prev.map((item, i) =>
        i === index ? { ...item, color: colorValue, colorHex: colorObj?.colorHex || '#9ca3af' } : item
      ))
    }
  }, [])

  const handleSaveEditPlan = useCallback(() => {
    if (!editingPlanId) return
    const validItems = editPlanItems.filter((i) => i.productId && i.size && i.color && i.quantity > 0)
    if (validItems.length === 0) {
      toast({ title: 'Ошибка', description: 'Добавьте хотя бы одну позицию', variant: 'destructive' })
      return
    }
    updatePlanItemsMutation.mutate({
      id: editingPlanId,
      data: {
        name: editingPlanName,
        items: validItems.map(({ productId, size, color, colorHex, quantity }) => ({
          productId, size, color, colorHex, quantity
        })),
      },
    })
  }, [editingPlanId, editingPlanName, editPlanItems, updatePlanItemsMutation, toast])

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <span className="ml-2 text-muted-foreground">Загрузка...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Планы пошива</h2>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Создать план
        </Button>
      </div>

      {plans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-3 opacity-30" />
            <p>Нет планов пошива</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Позиций</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan: Plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{getPlanStatusBadge(plan.status)}</TableCell>
                  <TableCell>{plan.items.length}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{formatDate(plan.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {plan.status === 'draft' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => openEditPlan(plan)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Изменить
                          </Button>
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => statusMutation.mutate({ id: plan.id, status: 'approved' })}
                            disabled={statusMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Утвердить
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(plan.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {plan.status === 'approved' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => openEditPlan(plan)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Изменить
                          </Button>
                          <Button
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                            onClick={() => statusMutation.mutate({ id: plan.id, status: 'in_work' })}
                            disabled={statusMutation.isPending}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            В работу
                          </Button>
                        </>
                      )}
                      {plan.status === 'in_work' && (
                        <Button
                          size="sm"
                          className="bg-sky-500 hover:bg-sky-600 text-white"
                          onClick={() => statusMutation.mutate({ id: plan.id, status: 'shipped' })}
                          disabled={statusMutation.isPending}
                        >
                          <Ship className="h-4 w-4 mr-1" />
                          Отгружен
                        </Button>
                      )}
                      {plan.status === 'shipped' && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => statusMutation.mutate({ id: plan.id, status: 'shipped_paid' })}
                          disabled={statusMutation.isPending}
                        >
                          <Banknote className="h-4 w-4 mr-1" />
                          Отгружен и оплачен
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Plan Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Редактировать план</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              {editingPlanStatus === 'approved' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-700">
                    <p className="font-medium">План уже утверждён</p>
                    <p className="text-amber-600">Добавленные позиции и увеличенные количества будут добавлены в план раскроя. Уменьшение количеств и удаление позиций недоступно.</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Название плана</Label>
                <Input value={editingPlanName} onChange={(e) => setEditingPlanName(e.target.value)} />
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Позиции</Label>
                  <Button size="sm" variant="outline" onClick={addEditPlanItemRow}>
                    <Plus className="h-4 w-4 mr-1" />Добавить
                  </Button>
                </div>
                <div className="space-y-2">
                  {editPlanItems.map((item, index) => {
                    const selectedProduct = products.find((p: Product) => p.id === item.productId)
                    const availableSizes = selectedProduct?.sizes || []
                    const availableColors = selectedProduct?.colors || []
                    const isApproved = editingPlanStatus === 'approved'
                    const isExistingItem = !!item.id

                    return (
                      <div key={index} className="flex items-end gap-2 flex-wrap">
                        <div className="flex-1 min-w-[140px]">
                          <Label className="text-xs text-muted-foreground">Изделие</Label>
                          <Select value={item.productId} onValueChange={(v) => handleEditProductChange(index, v)} disabled={isApproved && isExistingItem}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Выберите" /></SelectTrigger>
                            <SelectContent>
                              {products.map((p: Product) => (
                                <SelectItem key={p.id} value={p.id}>{p.name} ({p.article}){getKitLabel(p)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24">
                          <Label className="text-xs text-muted-foreground">Размер</Label>
                          {availableSizes.length > 0 ? (
                            <Select value={item.size} onValueChange={(v) => updateEditPlanItem(index, 'size', v)} disabled={isApproved && isExistingItem}>
                              <SelectTrigger className="w-full"><SelectValue placeholder="Размер" /></SelectTrigger>
                              <SelectContent>
                                {availableSizes.map((s) => (
                                  <SelectItem key={s.id} value={s.size}>{s.size}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input value={item.size} onChange={(e) => updateEditPlanItem(index, 'size', e.target.value)} disabled={isApproved && isExistingItem} />
                          )}
                        </div>
                        <div className="w-28">
                          <Label className="text-xs text-muted-foreground">Цвет</Label>
                          {availableColors.length > 0 || selectedProduct?.isKit ? (
                            <Select value={item.color} onValueChange={(v) => handleEditColorSelect(index, v, selectedProduct)} disabled={isApproved && isExistingItem}>
                              <SelectTrigger className="w-full"><SelectValue placeholder="Цвет" /></SelectTrigger>
                              <SelectContent>
                                {availableColors.map((c) => (
                                  <SelectItem key={c.id} value={c.color}>
                                    <span className="flex items-center gap-1.5">
                                      <span className="inline-block w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: c.colorHex }} />
                                      {c.color}
                                    </span>
                                  </SelectItem>
                                ))}
                                {selectedProduct?.isKit && (() => {
                                  const kitCombo = parseKitComboColors(selectedProduct.kitComboColors)
                                  return Object.keys(kitCombo).map(key => (
                                    <SelectItem key={key} value={key}>
                                      <span className="flex items-center gap-1.5">
                                        <span className="inline-block w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: '#808080' }} />
                                        {key}
                                      </span>
                                    </SelectItem>
                                  ))
                                })()}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input value={item.color} onChange={(e) => updateEditPlanItem(index, 'color', e.target.value)} disabled={isApproved && isExistingItem} />
                          )}
                        </div>
                        <div className="w-16">
                          <Label className="text-xs text-muted-foreground">Hex</Label>
                          <div className="flex items-center gap-1">
                            <input type="color" value={item.colorHex} onChange={(e) => updateEditPlanItem(index, 'colorHex', e.target.value)} className="w-6 h-8 rounded cursor-pointer border-0 p-0" disabled={isApproved && isExistingItem} />
                          </div>
                        </div>
                        <div className="w-20">
                          <Label className="text-xs text-muted-foreground">Кол-во</Label>
                          <Input
                            type="number"
                            min={isApproved && isExistingItem ? item.quantity : 0}
                            value={item.quantity || ''}
                            onChange={(e) => updateEditPlanItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 mb-0.5"
                          onClick={() => removeEditPlanItemRow(index)}
                          disabled={editPlanItems.length <= 1 || (isApproved && isExistingItem)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveEditPlan} disabled={updatePlanItemsMutation.isPending}>
              {updatePlanItemsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Plan Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Создать план пошива</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Название плана</Label>
                <Input
                  placeholder="Введите название"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Позиции</Label>
                  <Button size="sm" variant="outline" onClick={addPlanItemRow}>
                    <Plus className="h-4 w-4 mr-1" />
                    Добавить
                  </Button>
                </div>

                <div className="space-y-2">
                  {planItems.map((item, index) => {
                    const selectedProduct = products.find((p: Product) => p.id === item.productId)
                    const availableSizes = selectedProduct?.sizes || []
                    const availableColors = selectedProduct?.colors || []

                    return (
                      <div key={index} className="flex items-end gap-2 flex-wrap">
                        <div className="flex-1 min-w-[140px]">
                          <Label className="text-xs text-muted-foreground">Изделие</Label>
                          <Select
                            value={item.productId}
                            onValueChange={(v) => handleProductChange(index, v)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Выберите" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((p: Product) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} ({p.article}){getKitLabel(p)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24">
                          <Label className="text-xs text-muted-foreground">Размер</Label>
                          {availableSizes.length > 0 ? (
                            <Select
                              value={item.size}
                              onValueChange={(v) => updatePlanItem(index, 'size', v)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Размер" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableSizes.map((s) => (
                                  <SelectItem key={s.id} value={s.size}>
                                    {s.size}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              placeholder="Размер"
                              value={item.size}
                              onChange={(e) => updatePlanItem(index, 'size', e.target.value)}
                            />
                          )}
                        </div>
                        <div className="w-28">
                          <Label className="text-xs text-muted-foreground">Цвет</Label>
                          {availableColors.length > 0 || (selectedProduct?.isKit) ? (
                            <Select
                              value={item.color}
                              onValueChange={(v) => handleColorSelect(index, v, selectedProduct)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Цвет" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableColors.map((c) => (
                                  <SelectItem key={c.id} value={c.color}>
                                    <span className="flex items-center gap-1.5">
                                      <span
                                        className="inline-block w-3 h-3 rounded-full border border-gray-200"
                                        style={{ backgroundColor: c.colorHex }}
                                      />
                                      {c.color}
                                    </span>
                                  </SelectItem>
                                ))}
                                {selectedProduct?.isKit && (() => {
                                  const kitCombo = parseKitComboColors(selectedProduct.kitComboColors)
                                  return Object.keys(kitCombo).map(key => (
                                    <SelectItem key={key} value={key}>
                                      <span className="flex items-center gap-1.5">
                                        <span
                                          className="inline-block w-3 h-3 rounded-full border border-gray-200"
                                          style={{ backgroundColor: '#808080' }}
                                        />
                                        {key}
                                      </span>
                                    </SelectItem>
                                  ))
                                })()}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              placeholder="Цвет"
                              value={item.color}
                              onChange={(e) => updatePlanItem(index, 'color', e.target.value)}
                            />
                          )}
                        </div>
                        <div className="w-16">
                          <Label className="text-xs text-muted-foreground">Hex</Label>
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={item.colorHex}
                              onChange={(e) => updatePlanItem(index, 'colorHex', e.target.value)}
                              className="w-6 h-8 rounded cursor-pointer border-0 p-0"
                            />
                          </div>
                        </div>
                        <div className="w-20">
                          <Label className="text-xs text-muted-foreground">Кол-во</Label>
                          <Input
                            type="number"
                            min="0"
                            value={item.quantity || ''}
                            onChange={(e) => updatePlanItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 mb-0.5"
                          onClick={() => removePlanItemRow(index)}
                          disabled={planItems.length <= 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============ Tab 2: План раскроя ============
export function CuttingPlansTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [actualQtys, setActualQtys] = useState<Record<string, string>>({})

  const { data: cuttingPlans = [], isLoading } = useQuery({
    queryKey: ['cutting-plans'],
    queryFn: () => fetch('/api/cutting-plans').then((r) => r.json()),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string; items?: Array<{ id: string; actualQty: number | null }> } }) =>
      fetch(`/api/cutting-plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cutting-plans'] })
      toast({ title: 'Обновлено', description: 'План раскроя обновлён' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить план раскроя', variant: 'destructive' })
    },
  })

  const handleSaveActual = useCallback(
    (plan: CuttingPlan) => {
      const items = plan.items.map((item) => ({
        id: item.id,
        actualQty: actualQtys[item.id] !== undefined ? parseInt(actualQtys[item.id]) || null : item.actualQty,
      }))
      updateMutation.mutate({ id: plan.id, data: { items } })
    },
    [actualQtys, updateMutation]
  )

  const handleMarkCut = useCallback(
    (plan: CuttingPlan) => {
      const items = plan.items.map((item) => ({
        id: item.id,
        actualQty: actualQtys[item.id] !== undefined ? parseInt(actualQtys[item.id]) || null : item.actualQty,
      }))
      updateMutation.mutate({ id: plan.id, data: { status: 'cut', items } })
    },
    [actualQtys, updateMutation]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <span className="ml-2 text-muted-foreground">Загрузка...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Планы раскроя</h2>

      {cuttingPlans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Scissors className="h-12 w-12 mb-3 opacity-30" />
            <p>Нет планов раскроя. Утвердите план пошива для автоматического создания.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {cuttingPlans.map((cp: CuttingPlan) => (
            <Card key={cp.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base">{cp.plan.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(cp.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getCuttingStatusBadge(cp.status)}
                    {cp.status === 'in_work' && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleMarkCut(cp)}
                        disabled={updateMutation.isPending}
                      >
                        <Scissors className="h-4 w-4 mr-1" />
                        Раскроено
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveActual(cp)}
                      disabled={updateMutation.isPending}
                    >
                      Сохранить факт
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Изделие</TableHead>
                        <TableHead>Артикул</TableHead>
                        <TableHead>Размер</TableHead>
                        <TableHead>Цвет</TableHead>
                        <TableHead className="text-center">План</TableHead>
                        <TableHead className="text-center">Факт</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cp.items.map((item) => {
                        const currentActual = actualQtys[item.id] !== undefined ? actualQtys[item.id] : (item.actualQty ?? '')
                        const hasMismatch = item.actualQty !== null && item.actualQty !== item.plannedQty
                        return (
                          <TableRow key={item.id} className={hasMismatch ? 'bg-red-50' : ''}>
                            <TableCell className="font-medium">{item.product.name}</TableCell>
                            <TableCell className="text-muted-foreground">{item.product.article}</TableCell>
                            <TableCell>{item.size}</TableCell>
                            <TableCell>
                              <span className="flex items-center">
                                {getColorDot(item.colorHex)}
                                {item.color}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">{item.plannedQty}</TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                min="0"
                                className="w-20 mx-auto text-center"
                                value={currentActual}
                                onChange={(e) =>
                                  setActualQtys((prev) => ({
                                    ...prev,
                                    [item.id]: e.target.value,
                                  }))
                                }
                              />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ============ Tab 3: Задания для швей ============
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
      // Group by employee
      const byEmployee = new Map<string, Array<{ productId: string; size: string; color: string; colorHex: string; quantity: number }>>()
      for (const assignment of validAssignments) {
        const cpItem = plan.items.find(i => i.id === assignment.cuttingPlanItemId)
        if (!cpItem) continue

        if (!byEmployee.has(assignment.employeeId)) {
          byEmployee.set(assignment.employeeId, [])
        }
        byEmployee.get(assignment.employeeId)!.push({
          productId: cpItem.productId,
          size: cpItem.size,
          color: cpItem.color,
          colorHex: cpItem.colorHex,
          quantity: assignment.quantity,
        })
      }

      // Create one SewingTask per employee
      const promises = Array.from(byEmployee.entries()).map(([employeeId, items]) =>
        fetch('/api/sewing-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cuttingPlanId: selectedCuttingPlanId, employeeId, items }),
        }).then(r => {
          if (!r.ok) return r.json().then(d => { throw new Error(d.error || 'Ошибка') })
          return r.json()
        })
      )

      await Promise.all(promises)

      queryClient.invalidateQueries({ queryKey: ['sewing-tasks'] })
      setAssignments([])
      toast({ title: 'Задания сформированы', description: `Создано ${promises.length} заданий` })
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
// ============ Tab 4: Распределение по городам ============
export function CityDistributionTab({ customerId }: { customerId?: string | null } = {}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [sellerName, setSellerName] = useState('')
  const [sellerItems, setSellerItems] = useState<Array<{
    productId: string
    size: string
    color: string
    colorHex: string
    quantity: number
    cities: Array<{ city: string; quantity: number }>
  }>>([{ productId: '', size: '', color: '', colorHex: '#9ca3af', quantity: 0, cities: [] }])

  const { data: sellerPlans = [], isLoading } = useQuery({
    queryKey: ['seller-plans', customerId],
    queryFn: () => {
      const params = customerId ? `?customerId=${customerId}` : ''
      return fetch(`/api/seller-plans${params}`).then((r) => r.json())
    },
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then((r) => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: (data: {
      sellerName: string
      customerId?: string | null
      items: Array<{
        productId: string
        size: string
        color: string
        colorHex: string
        quantity: number
        cities: Array<{ city: string; quantity: number }>
      }>
    }) =>
      fetch('/api/seller-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-plans'] })
      setCreateDialogOpen(false)
      setSellerName('')
      setSellerItems([{ productId: '', size: '', color: '', colorHex: '#9ca3af', quantity: 0, cities: [] }])
      toast({ title: 'План создан', description: 'План распределения создан' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось создать план', variant: 'destructive' })
    },
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/seller-plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-plans'] })
      toast({ title: 'План утверждён', description: 'План распределения утверждён' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось утвердить план', variant: 'destructive' })
    },
  })

  const addSellerItemRow = useCallback(() => {
    setSellerItems((prev) => [...prev, { productId: '', size: '', color: '', colorHex: '#9ca3af', quantity: 0, cities: [] }])
  }, [])

  const removeSellerItemRow = useCallback((index: number) => {
    setSellerItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const updateSellerItem = useCallback((index: number, field: string, value: string | number) => {
    setSellerItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }, [])

  const addCityToItem = useCallback((itemIndex: number) => {
    setSellerItems((prev) =>
      prev.map((item, i) =>
        i === itemIndex ? { ...item, cities: [...item.cities, { city: '', quantity: 0 }] } : item
      )
    )
  }, [])

  const removeCityFromItem = useCallback((itemIndex: number, cityIndex: number) => {
    setSellerItems((prev) =>
      prev.map((item, i) =>
        i === itemIndex ? { ...item, cities: item.cities.filter((_, ci) => ci !== cityIndex) } : item
      )
    )
  }, [])

  const updateCityInItem = useCallback((itemIndex: number, cityIndex: number, field: string, value: string | number) => {
    setSellerItems((prev) =>
      prev.map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              cities: item.cities.map((c, ci) => (ci === cityIndex ? { ...c, [field]: value } : c)),
            }
          : item
      )
    )
  }, [])

  const handleCreate = useCallback(() => {
    if (!sellerName.trim()) {
      toast({ title: 'Ошибка', description: 'Укажите название плана', variant: 'destructive' })
      return
    }
    const validItems = sellerItems.filter((i) => i.productId && i.size && i.color && i.quantity > 0)
    if (validItems.length === 0) {
      toast({ title: 'Ошибка', description: 'Добавьте хотя бы одну позицию', variant: 'destructive' })
      return
    }
    createMutation.mutate({ sellerName, items: validItems })
  }, [sellerName, sellerItems, createMutation, toast])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <span className="ml-2 text-muted-foreground">Загрузка...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Распределение по городам</h2>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Создать план
        </Button>
      </div>

      {sellerPlans.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Truck className="h-12 w-12 mb-3 opacity-30" />
            <p>Нет планов распределения</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Позиций</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellerPlans.map((sp: SellerPlan) => (
                <TableRow key={sp.id}>
                  <TableCell className="font-medium">{sp.sellerName}</TableCell>
                  <TableCell>{getPlanStatusBadge(sp.status)}</TableCell>
                  <TableCell>{sp.items.length}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{formatDate(sp.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {sp.status === 'draft' && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => approveMutation.mutate(sp.id)}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Утвердить
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Distribution Plan Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Создать план распределения</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Название плана</Label>
                <Input
                  placeholder="Введите название плана"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Позиции</Label>
                  <Button size="sm" variant="outline" onClick={addSellerItemRow}>
                    <Plus className="h-4 w-4 mr-1" />
                    Добавить позицию
                  </Button>
                </div>

                <div className="space-y-4">
                  {sellerItems.map((item, index) => {
                    const selectedProduct = products.find((p: Product) => p.id === item.productId)
                    const availableSizes = selectedProduct?.sizes || []
                    const availableColors = selectedProduct?.colors || []

                    return (
                      <Card key={index} className="p-3">
                        <div className="flex items-end gap-2 flex-wrap">
                          <div className="flex-1 min-w-[140px]">
                            <Label className="text-xs text-muted-foreground">Изделие</Label>
                            <Select
                              value={item.productId}
                              onValueChange={(v) => updateSellerItem(index, 'productId', v)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Выберите" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((p: Product) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name} ({p.article}){getKitLabel(p)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-24">
                            <Label className="text-xs text-muted-foreground">Размер</Label>
                            {availableSizes.length > 0 ? (
                              <Select
                                value={item.size}
                                onValueChange={(v) => updateSellerItem(index, 'size', v)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Размер" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableSizes.map((s) => (
                                    <SelectItem key={s.id} value={s.size}>
                                      {s.size}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={item.size}
                                onChange={(e) => updateSellerItem(index, 'size', e.target.value)}
                              />
                            )}
                          </div>
                          <div className="w-28">
                            <Label className="text-xs text-muted-foreground">Цвет</Label>
                            {availableColors.length > 0 || (selectedProduct?.isKit) ? (
                              <Select
                                value={item.color}
                                onValueChange={(v) => {
                                  const kitCombo = parseKitComboColors(selectedProduct?.kitComboColors)
                                  if (selectedProduct?.isKit && kitCombo[v]) {
                                    updateSellerItem(index, 'color', v)
                                    updateSellerItem(index, 'colorHex', '#808080')
                                  } else {
                                    const colorObj = availableColors.find(c => c.color === v)
                                    updateSellerItem(index, 'color', v)
                                    updateSellerItem(index, 'colorHex', colorObj?.colorHex || '#9ca3af')
                                  }
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Цвет" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableColors.map((c) => (
                                    <SelectItem key={c.id} value={c.color}>
                                      <span className="flex items-center gap-1.5">
                                        <span
                                          className="inline-block w-3 h-3 rounded-full border border-gray-200"
                                          style={{ backgroundColor: c.colorHex }}
                                        />
                                        {c.color}
                                      </span>
                                    </SelectItem>
                                  ))}
                                  {selectedProduct?.isKit && (() => {
                                    const kitCombo = parseKitComboColors(selectedProduct.kitComboColors)
                                    return Object.keys(kitCombo).map(key => (
                                      <SelectItem key={key} value={key}>
                                        <span className="flex items-center gap-1.5">
                                          <span
                                            className="inline-block w-3 h-3 rounded-full border border-gray-200"
                                            style={{ backgroundColor: '#808080' }}
                                          />
                                          {key}
                                        </span>
                                      </SelectItem>
                                    ))
                                  })()}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={item.color}
                                onChange={(e) => updateSellerItem(index, 'color', e.target.value)}
                              />
                            )}
                          </div>
                          <div className="w-16">
                            <Label className="text-xs text-muted-foreground">Hex</Label>
                            <div className="flex items-center gap-1">
                              <input
                                type="color"
                                value={item.colorHex}
                                onChange={(e) => updateSellerItem(index, 'colorHex', e.target.value)}
                                className="w-6 h-8 rounded cursor-pointer border-0 p-0"
                              />
                            </div>
                          </div>
                          <div className="w-20">
                            <Label className="text-xs text-muted-foreground">Кол-во</Label>
                            <Input
                              type="number"
                              min="0"
                              value={item.quantity || ''}
                              onChange={(e) => updateSellerItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 mb-0.5"
                            onClick={() => removeSellerItemRow(index)}
                            disabled={sellerItems.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Cities sub-section */}
                        <div className="mt-3 ml-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium text-muted-foreground">Города</Label>
                            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => addCityToItem(index)}>
                              <Plus className="h-3 w-3 mr-1" />
                              Добавить город
                            </Button>
                          </div>
                          {item.cities.map((city, cityIndex) => (
                            <div key={cityIndex} className="flex items-center gap-2 ml-2">
                              <Input
                                className="w-36"
                                placeholder="Город"
                                value={city.city}
                                onChange={(e) => updateCityInItem(index, cityIndex, 'city', e.target.value)}
                              />
                              <Input
                                type="number"
                                className="w-20"
                                placeholder="Кол-во"
                                min="0"
                                value={city.quantity || ''}
                                onChange={(e) => updateCityInItem(index, cityIndex, 'quantity', parseInt(e.target.value) || 0)}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                                onClick={() => removeCityFromItem(index, cityIndex)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============ Tab 5: Короба ============
export function BoxesTab({ customerId }: { customerId?: string | null } = {}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [selectedSellerPlanId, setSelectedSellerPlanId] = useState('')
  const [actualQtys, setActualQtys] = useState<Record<string, string>>({})

  const { data: boxes = [], isLoading } = useQuery({
    queryKey: ['boxes', customerId],
    queryFn: () => {
      const params = customerId ? `?customerId=${customerId}` : ''
      return fetch(`/api/boxes${params}`).then((r) => r.json())
    },
  })

  const { data: sellerPlans = [] } = useQuery({
    queryKey: ['seller-plans', customerId],
    queryFn: () => {
      const params = customerId ? `?customerId=${customerId}` : ''
      return fetch(`/api/seller-plans${params}`).then((r) => r.json())
    },
  })

  const approvedSellerPlans = sellerPlans.filter((sp: SellerPlan) => sp.status === 'approved')

  const groupedBoxes = useMemo(() => {
    const groups: Record<string, Box[]> = {}
    for (const box of boxes as Box[]) {
      if (!groups[box.city]) groups[box.city] = []
      groups[box.city].push(box)
    }
    return groups
  }, [boxes])

  const generateMutation = useMutation({
    mutationFn: (sellerPlanId: string) =>
      fetch('/api/boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerPlanId }),
      }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') })
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
      setGenerateDialogOpen(false)
      setSelectedSellerPlanId('')
      toast({ title: 'Короба сгенерированы', description: 'Короба успешно созданы' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message || 'Не удалось сгенерировать короба', variant: 'destructive' })
    },
  })

  const updateBoxMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string; items?: Array<{ id: string; actualQty: number | null }> } }) =>
      fetch(`/api/boxes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
      toast({ title: 'Обновлено', description: 'Короб обновлён' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить короб', variant: 'destructive' })
    },
  })

  const handleSaveActual = useCallback(
    (box: Box) => {
      const items = box.items.map((item) => ({
        id: item.id,
        actualQty: actualQtys[item.id] !== undefined ? parseInt(actualQtys[item.id]) || null : item.actualQty,
      }))
      updateBoxMutation.mutate({ id: box.id, data: { items } })
    },
    [actualQtys, updateBoxMutation]
  )

  const handleAdvanceStatus = useCallback(
    (box: Box) => {
      const nextStatus: Record<string, string> = {
        forming: 'assembled',
        assembled: 'checked',
        checked: 'shipped',
      }
      const newStatus = nextStatus[box.status]
      if (!newStatus) return
      const items = box.items.map((item) => ({
        id: item.id,
        actualQty: actualQtys[item.id] !== undefined ? parseInt(actualQtys[item.id]) || null : item.actualQty,
      }))
      updateBoxMutation.mutate({ id: box.id, data: { status: newStatus, items } })
    },
    [actualQtys, updateBoxMutation]
  )

  const handlePrint = useCallback(async (boxId: string) => {
    try {
      const res = await fetch(`/api/boxes/print/${boxId}`)
      const data = await res.json()
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast({ title: 'Ошибка', description: 'Не удалось открыть окно печати. Разрешите всплывающие окна.', variant: 'destructive' })
        return
      }
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Короб #${data.boxNumber} - ${data.city}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { font-size: 18px; margin-bottom: 4px; }
            h2 { font-size: 14px; color: #666; margin-top: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; font-size: 12px; }
            th { background: #f5f5f5; }
            .mismatch { background: #fee; }
            .color-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; vertical-align: middle; border: 1px solid #ddd; }
            .summary { margin-top: 16px; font-size: 13px; }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          <h1>Короб #${data.boxNumber}</h1>
          <h2>Город: ${data.city} | План: ${data.sellerName}</h2>
          <table>
            <thead>
              <tr>
                <th>Изделие</th>
                <th>Артикул</th>
                <th>Размер</th>
                <th>Цвет</th>
                <th>План</th>
                <th>Факт</th>
              </tr>
            </thead>
            <tbody>
              ${data.items.map((item: { productName: string; article: string; size: string; color: string; colorHex: string; plannedQty: number; actualQty: number | null; mismatch: boolean }) => `
                <tr class="${item.mismatch ? 'mismatch' : ''}">
                  <td>${item.productName}</td>
                  <td>${item.article}</td>
                  <td>${item.size}</td>
                  <td><span class="color-dot" style="background:${item.colorHex}"></span>${item.color}</td>
                  <td>${item.plannedQty}</td>
                  <td>${item.actualQty ?? '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="summary">
            <strong>Итого:</strong> План: ${data.totalPlanned} | Факт: ${data.totalActual}
            ${data.hasMismatches ? ' <span style="color:red">⚠ Есть расхождения</span>' : ''}
          </div>
          <script>window.print();</script>
        </body>
        </html>
      `)
      printWindow.document.close()
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить данные для печати', variant: 'destructive' })
    }
  }, [toast])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <span className="ml-2 text-muted-foreground">Загрузка...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Короба</h2>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setGenerateDialogOpen(true)}
          disabled={approvedSellerPlans.length === 0}
        >
          <Package className="h-4 w-4 mr-1" />
          Сгенерировать короба
        </Button>
      </div>

      {boxes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mb-3 opacity-30" />
            <p>Нет коробов. Сгенерируйте короба из утверждённого плана распределения.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedBoxes).map(([city, cityBoxes]) => (
            <div key={city}>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-600" />
                {city}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cityBoxes.map((box) => (
                  <Card key={box.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">Короб #{box.boxNumber}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            План: {box.sellerPlan.sellerName}
                          </p>
                        </div>
                        {getBoxStatusBadge(box.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="overflow-x-auto -mx-2">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs h-8 px-2">Изделие</TableHead>
                              <TableHead className="text-xs h-8 px-2">Размер</TableHead>
                              <TableHead className="text-xs h-8 px-2">Цвет</TableHead>
                              <TableHead className="text-xs h-8 px-2 text-center">План</TableHead>
                              <TableHead className="text-xs h-8 px-2 text-center">Факт</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {box.items.map((item) => {
                              const currentActual = actualQtys[item.id] !== undefined ? actualQtys[item.id] : (item.actualQty ?? '')
                              return (
                                <TableRow key={item.id}>
                                  <TableCell className="text-xs px-2 py-1 font-medium">{item.product.name}</TableCell>
                                  <TableCell className="text-xs px-2 py-1">{item.size}</TableCell>
                                  <TableCell className="text-xs px-2 py-1">
                                    <span className="flex items-center">
                                      {getColorDot(item.colorHex)}
                                      <span className="truncate max-w-[60px]">{item.color}</span>
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-xs px-2 py-1 text-center">{item.plannedQty}</TableCell>
                                  <TableCell className="text-xs px-2 py-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      className="w-16 mx-auto text-center h-7 text-xs p-1"
                                      value={currentActual}
                                      onChange={(e) =>
                                        setActualQtys((prev) => ({
                                          ...prev,
                                          [item.id]: e.target.value,
                                        }))
                                      }
                                    />
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {box.status !== 'shipped' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveActual(box)}
                            disabled={updateBoxMutation.isPending}
                          >
                            Сохранить факт
                          </Button>
                        )}
                        {box.status !== 'shipped' && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleAdvanceStatus(box)}
                            disabled={updateBoxMutation.isPending}
                          >
                            {box.status === 'forming' && 'Собран'}
                            {box.status === 'assembled' && 'Проверен'}
                            {box.status === 'checked' && 'Отгружён'}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePrint(box.id)}
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
          ))}
        </div>
      )}

      {/* Generate Boxes Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Сгенерировать короба</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Выберите утверждённый план распределения</Label>
              <Select value={selectedSellerPlanId} onValueChange={setSelectedSellerPlanId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите план" />
                </SelectTrigger>
                <SelectContent>
                  {approvedSellerPlans.map((sp: SellerPlan) => (
                    <SelectItem key={sp.id} value={sp.id}>
                      {sp.sellerName} ({sp.items.length} поз.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => selectedSellerPlanId && generateMutation.mutate(selectedSellerPlanId)}
              disabled={!selectedSellerPlanId || generateMutation.isPending}
            >
              {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сгенерировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============ Customer Plan Tab (unified plan + city distribution) ============
export function CustomerPlanTab({ customerId }: { customerId: string | null }) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Form state
  const [planName, setPlanName] = useState('')
  const [planItems, setPlanItems] = useState<Array<{
    productId: string
    size: string
    color: string
    colorHex: string
    quantity: number
    cities: Array<{ city: string; quantity: number }>
  }>>([])

  // Existing plans
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null)

  // Queries
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then(r => r.json()),
  })

  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerId ? fetch(`/api/customers/${customerId}`).then(r => r.json()) : null,
    enabled: !!customerId,
  })

  const { data: cities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: () => fetch('/api/cities').then(r => r.json()),
  })

  const { data: sellerPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['seller-plans', customerId],
    queryFn: () => customerId ? fetch(`/api/seller-plans?customerId=${customerId}`).then(r => r.json()) : [],
    enabled: !!customerId,
  })

  // Use customer's product catalog if available, otherwise all products
  const availableProducts = customer?.customerProducts?.map((cp: any) => cp.product) || products

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: (data: {
      sellerName: string
      customerId: string | null
      items: Array<{
        productId: string
        size: string
        color: string
        colorHex: string
        quantity: number
        cities: Array<{ city: string; quantity: number }>
      }>
    }) =>
      fetch('/api/seller-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-plans'] })
      setPlanName('')
      setPlanItems([])
      toast({ title: 'План создан', description: 'План пошива с распределением по городам создан' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось создать план', variant: 'destructive' })
    },
  })

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/seller-plans/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-plans'] })
      if (expandedPlanId) setExpandedPlanId(null)
      toast({ title: 'План удалён' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось удалить план', variant: 'destructive' })
    },
  })

  // Approve plan mutation
  const approvePlanMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/seller-plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-plans'] })
      toast({ title: 'План утверждён' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось утвердить план', variant: 'destructive' })
    },
  })

  // Item management
  const addPlanItemRow = useCallback(() => {
    setPlanItems(prev => [...prev, { productId: '', size: '', color: '', colorHex: '#9ca3af', quantity: 0, cities: [] }])
  }, [])

  const removePlanItemRow = useCallback((index: number) => {
    setPlanItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updatePlanItem = useCallback((index: number, field: string, value: string | number) => {
    setPlanItems(prev => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }, [])

  const handleProductChange = useCallback((index: number, productId: string) => {
    setPlanItems(prev => prev.map((item, i) =>
      i === index ? { ...item, productId, size: '', color: '', colorHex: '#9ca3af' } : item
    ))
  }, [])

  const handleColorSelect = useCallback((index: number, colorValue: string, selectedProduct: Product | undefined) => {
    if (!selectedProduct) return
    const kitCombo = parseKitComboColors(selectedProduct.kitComboColors)
    if (selectedProduct.isKit && kitCombo[colorValue]) {
      setPlanItems(prev => prev.map((item, i) =>
        i === index ? { ...item, color: colorValue, colorHex: '#808080' } : item
      ))
    } else {
      const colorObj = selectedProduct.colors.find(c => c.color === colorValue)
      setPlanItems(prev => prev.map((item, i) =>
        i === index ? { ...item, color: colorValue, colorHex: colorObj?.colorHex || '#9ca3af' } : item
      ))
    }
  }, [])

  // City management for each item
  const addCityToItem = useCallback((itemIndex: number) => {
    setPlanItems(prev =>
      prev.map((item, i) =>
        i === itemIndex ? { ...item, cities: [...item.cities, { city: '', quantity: 0 }] } : item
      )
    )
  }, [])

  const removeCityFromItem = useCallback((itemIndex: number, cityIndex: number) => {
    setPlanItems(prev =>
      prev.map((item, i) =>
        i === itemIndex ? { ...item, cities: item.cities.filter((_, ci) => ci !== cityIndex) } : item
      )
    )
  }, [])

  const updateCityInItem = useCallback((itemIndex: number, cityIndex: number, field: string, value: string | number) => {
    setPlanItems(prev =>
      prev.map((item, i) =>
        i === itemIndex
          ? { ...item, cities: item.cities.map((c, ci) => (ci === cityIndex ? { ...c, [field]: value } : c)) }
          : item
      )
    )
  }, [])

  // Calculate unallocated
  const getUnallocated = useCallback((item: typeof planItems[0]) => {
    const allocated = item.cities.reduce((sum, c) => sum + c.quantity, 0)
    return item.quantity - allocated
  }, [])

  // Validate and save
  const handleCreate = useCallback(() => {
    if (!planName.trim()) {
      toast({ title: 'Ошибка', description: 'Укажите название плана', variant: 'destructive' })
      return
    }
    const validItems = planItems.filter(i => i.productId && i.size && i.color && i.quantity > 0)
    if (validItems.length === 0) {
      toast({ title: 'Ошибка', description: 'Добавьте хотя бы одну позицию', variant: 'destructive' })
      return
    }
    // Validate city quantities don't exceed total
    for (const item of validItems) {
      const unallocated = getUnallocated(item)
      if (unallocated < 0) {
        const productName = products.find((p: Product) => p.id === item.productId)?.name || 'Изделие'
        toast({
          title: 'Ошибка',
          description: `Распределение по городам превышает количество для "${productName}, ${item.size}, ${item.color}"`,
          variant: 'destructive',
        })
        return
      }
    }
    createPlanMutation.mutate({ sellerName: planName, customerId, items: validItems })
  }, [planName, planItems, customerId, createPlanMutation, toast, products, getUnallocated])

  const isLoading = customerLoading || plansLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <span className="ml-2 text-muted-foreground">Загрузка...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Existing plans */}
      {sellerPlans.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Мои планы пошива</h2>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Позиций</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellerPlans.map((sp: SellerPlan) => (
                  <Fragment key={sp.id}>
                    <TableRow className="cursor-pointer hover:bg-gray-50" onClick={() => setExpandedPlanId(expandedPlanId === sp.id ? null : sp.id)}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {expandedPlanId === sp.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          {sp.sellerName}
                        </div>
                      </TableCell>
                      <TableCell>{getPlanStatusBadge(sp.status)}</TableCell>
                      <TableCell>{sp.items.length}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatDate(sp.createdAt)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {sp.status === 'draft' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => approvePlanMutation.mutate(sp.id)}
                                disabled={approvePlanMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Утвердить
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deletePlanMutation.mutate(sp.id)}
                                disabled={deletePlanMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedPlanId === sp.id && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-gray-50/50 p-4">
                          <div className="space-y-3">
                            {sp.items.map((item: SellerPlanItem) => {
                              const allocated = item.cities.reduce((sum, c) => sum + c.quantity, 0)
                              const unallocated = item.quantity - allocated
                              return (
                                <Card key={item.id} className="p-3">
                                  <div className="font-medium text-sm mb-2 flex items-center gap-2">
                                    {getColorDot(item.colorHex)}
                                    {item.product?.name}, {item.size}, {item.color}
                                    <span className="text-muted-foreground">({item.quantity} шт)</span>
                                  </div>
                                  {item.cities.length > 0 && (
                                    <div className="ml-5 space-y-1">
                                      {item.cities.map((c: SellerPlanCity) => (
                                        <div key={c.id} className="flex items-center gap-3 text-sm">
                                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                          <span>{c.city}</span>
                                          <span className="font-medium">{c.quantity} шт</span>
                                        </div>
                                      ))}
                                      <div className={`text-sm font-medium mt-1 ${unallocated > 0 ? 'text-amber-600' : unallocated === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        Нераспределено: {unallocated} шт
                                      </div>
                                    </div>
                                  )}
                                  {item.cities.length === 0 && (
                                    <div className="ml-5 text-sm text-amber-600 font-medium">
                                      Нераспределено: {unallocated} шт
                                    </div>
                                  )}
                                </Card>
                              )
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Create new plan form */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Новый план пошива</h2>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={addPlanItemRow}
            disabled={planItems.length > 0}
          >
            <Plus className="h-4 w-4 mr-1" />
            Добавить позицию
          </Button>
        </div>

        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Plan name */}
            <div className="space-y-2">
              <Label>Название плана</Label>
              <Input
                placeholder="Введите название плана"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
            </div>

            <Separator />

            {/* Items */}
            {planItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>Нажмите «Добавить позицию» для начала</p>
              </div>
            ) : (
              <div className="space-y-6">
                {planItems.map((item, index) => {
                  const selectedProduct = availableProducts.find((p: Product) => p.id === item.productId)
                  const availableSizes = selectedProduct?.sizes || []
                  const availableColors = selectedProduct?.colors || []
                  const unallocated = getUnallocated(item)

                  return (
                    <Card key={index} className="border border-gray-200">
                      <CardContent className="p-4 space-y-3">
                        {/* Item header row */}
                        <div className="flex items-end gap-2 flex-wrap">
                          <div className="flex-1 min-w-[140px]">
                            <Label className="text-xs text-muted-foreground">Изделие</Label>
                            <Select
                              value={item.productId}
                              onValueChange={(v) => handleProductChange(index, v)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Выберите" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableProducts.map((p: Product) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name} ({p.article}){getKitLabel(p)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-24">
                            <Label className="text-xs text-muted-foreground">Размер</Label>
                            {availableSizes.length > 0 ? (
                              <Select
                                value={item.size}
                                onValueChange={(v) => updatePlanItem(index, 'size', v)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Размер" />
                                </SelectTrigger>
                                <SelectContent>
                                  {sortSizes(availableSizes.map(s => s.size)).map(size => (
                                    <SelectItem key={size} value={size}>
                                      {size}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                placeholder="Размер"
                                value={item.size}
                                onChange={(e) => updatePlanItem(index, 'size', e.target.value)}
                              />
                            )}
                          </div>
                          <div className="w-28">
                            <Label className="text-xs text-muted-foreground">Цвет</Label>
                            {availableColors.length > 0 || selectedProduct?.isKit ? (
                              <Select
                                value={item.color}
                                onValueChange={(v) => handleColorSelect(index, v, selectedProduct)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Цвет" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableColors.map((c) => (
                                    <SelectItem key={c.id} value={c.color}>
                                      <span className="flex items-center gap-1.5">
                                        <span className="inline-block w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: c.colorHex }} />
                                        {c.color}
                                      </span>
                                    </SelectItem>
                                  ))}
                                  {selectedProduct?.isKit && (() => {
                                    const kitCombo = parseKitComboColors(selectedProduct.kitComboColors)
                                    return Object.keys(kitCombo).map(key => (
                                      <SelectItem key={key} value={key}>
                                        <span className="flex items-center gap-1.5">
                                          <span className="inline-block w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: '#808080' }} />
                                          {key}
                                        </span>
                                      </SelectItem>
                                    ))
                                  })()}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                placeholder="Цвет"
                                value={item.color}
                                onChange={(e) => updatePlanItem(index, 'color', e.target.value)}
                              />
                            )}
                          </div>
                          <div className="w-16">
                            <Label className="text-xs text-muted-foreground">Hex</Label>
                            <div className="flex items-center gap-1">
                              <input
                                type="color"
                                value={item.colorHex}
                                onChange={(e) => updatePlanItem(index, 'colorHex', e.target.value)}
                                className="w-6 h-8 rounded cursor-pointer border-0 p-0"
                              />
                            </div>
                          </div>
                          <div className="w-24">
                            <Label className="text-xs text-muted-foreground">Кол-во</Label>
                            <Input
                              type="number"
                              min="0"
                              value={item.quantity || ''}
                              onChange={(e) => updatePlanItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 mb-0.5"
                            onClick={() => removePlanItemRow(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* City distribution for this item */}
                        {item.productId && item.size && item.color && item.quantity > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" />
                                Распределение по городам
                              </Label>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs"
                                onClick={() => addCityToItem(index)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Добавить город
                              </Button>
                            </div>

                            {item.cities.map((city, cityIndex) => (
                              <div key={cityIndex} className="flex items-center gap-2 ml-4">
                                {cities.length > 0 ? (
                                  <Select
                                    value={city.city}
                                    onValueChange={(v) => updateCityInItem(index, cityIndex, 'city', v)}
                                  >
                                    <SelectTrigger className="w-48">
                                      <SelectValue placeholder="Выберите город" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {cities.map((c: { id: string; name: string }) => (
                                        <SelectItem key={c.id} value={c.name}>
                                          {c.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    className="w-48"
                                    placeholder="Город"
                                    value={city.city}
                                    onChange={(e) => updateCityInItem(index, cityIndex, 'city', e.target.value)}
                                  />
                                )}
                                <Input
                                  type="number"
                                  className="w-24"
                                  placeholder="Кол-во"
                                  min="0"
                                  max={unallocated + city.quantity}
                                  value={city.quantity || ''}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0
                                    const maxAllowed = unallocated + city.quantity
                                    updateCityInItem(index, cityIndex, 'quantity', Math.min(val, maxAllowed))
                                  }}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-700 h-6 w-6 p-0"
                                  onClick={() => removeCityFromItem(index, cityIndex)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}

                            {/* Unallocated indicator */}
                            <div className={`ml-4 text-sm font-medium ${unallocated > 0 ? 'text-amber-600' : unallocated === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {unallocated > 0 && (
                                <span className="flex items-center gap-1">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Нераспределено: {unallocated} шт
                                </span>
                              )}
                              {unallocated === 0 && item.cities.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Полностью распределено
                                </span>
                              )}
                              {unallocated === 0 && item.cities.length === 0 && (
                                <span className="flex items-center gap-1">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Нераспределено: {item.quantity} шт
                                </span>
                              )}
                              {unallocated < 0 && (
                                <span className="flex items-center gap-1">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Превышено на {Math.abs(unallocated)} шт!
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}

                {/* Add more items */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={addPlanItemRow}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить позицию
                </Button>
              </div>
            )}

            {/* Save button */}
            {planItems.length > 0 && (
              <div className="flex justify-end pt-2">
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleCreate}
                  disabled={createPlanMutation.isPending}
                >
                  {createPlanMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Создать план
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ============ Customer Products Tab ============
export function CustomerProductsTab({ customerId }: { customerId: string | null }) {
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerId ? fetch(`/api/customers/${customerId}`).then(r => r.json()) : null,
    enabled: !!customerId,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      <span className="ml-2 text-muted-foreground">Загрузка...</span>
    </div>
  )

  const products = customer?.customerProducts || []

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Мои изделия</h2>
      {products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mb-3 opacity-30" />
            <p>Нет изделий в вашем каталоге</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((cp: any) => (
            <Card key={cp.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{cp.product?.name || 'Изделие'}</CardTitle>
                <CardDescription className="text-xs">{cp.product?.article}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {cp.product?.sizes?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {cp.product.sizes.map((s: any) => <Badge key={s.id} variant="outline" className="text-xs">{s.size}</Badge>)}
                  </div>
                )}
                {cp.product?.colors?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {cp.product.colors.map((c: any) => (
                      <Badge key={c.id} variant="outline" className="text-xs gap-1">
                        <span className="inline-block w-2.5 h-2.5 rounded-full border border-gray-200" style={{ backgroundColor: c.colorHex }} />
                        {c.color}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                  {cp.customBoxCapacity && <div><span className="text-muted-foreground">В короб:</span> {cp.customBoxCapacity} шт</div>}
                  {cp.customWeight && <div><span className="text-muted-foreground">Вес:</span> {cp.customWeight} гр</div>}
                  {cp.customDimensions && <div><span className="text-muted-foreground">Габариты:</span> {cp.customDimensions}</div>}
                  {cp.customWidth && <div><span className="text-muted-foreground">Ширина:</span> {cp.customWidth} см</div>}
                  {cp.customHeight && <div><span className="text-muted-foreground">Высота:</span> {cp.customHeight} см</div>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ============ Stub for roles without access ============
export function StubTab({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <FileText className="h-16 w-16 mb-4 opacity-20" />
      <p className="text-lg font-medium">Раздел в разработке</p>
      {message && <p className="text-sm mt-1 max-w-md text-center">{message}</p>}
      {!message && <p className="text-sm mt-1">Данный раздел будет доступен позже</p>}
    </div>
  )
}

// ============ Tab: Справочник ============
// ============ Standard Size Grids & Colors (frontend constants) ============
const STANDARD_SIZE_GRIDS: { label: string; sizes: string[] }[] = [
  { label: 'S/M/L/XL', sizes: ['S', 'M', 'L', 'XL'] },
  { label: 'XS-3XL', sizes: ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'] },
  { label: '42-52 (чётные)', sizes: ['42', '44', '46', '48', '50', '52'] },
  { label: '42-56 (чётные)', sizes: ['42', '44', '46', '48', '50', '52', '54', '56'] },
  { label: '80-92', sizes: ['80', '86', '92'] },
  { label: '80-110', sizes: ['80', '86', '92', '98', '104', '110'] },
  { label: '104-128', sizes: ['104', '110', '116', '122', '128'] },
  { label: 'ONE SIZE', sizes: ['ONE SIZE'] },
]

const STANDARD_COLORS: { color: string; hex: string }[] = [
  { color: 'чёрный', hex: '#1a1a1a' },
  { color: 'белый', hex: '#ffffff' },
  { color: 'тёмно-синий', hex: '#1e3a5f' },
  { color: 'серый', hex: '#808080' },
  { color: 'бежевый', hex: '#d4b896' },
  { color: 'красный', hex: '#dc2626' },
  { color: 'зелёный', hex: '#16a34a' },
  { color: 'коричневый', hex: '#7c5835' },
  { color: 'розовый', hex: '#f472b6' },
  { color: 'голубой', hex: '#38bdf8' },
  { color: 'бордовый', hex: '#7f1d1d' },
  { color: 'молочный', hex: '#faf5e4' },
]

const EMPLOYEE_ROLES: { value: string; label: string }[] = [
  { value: 'sewer', label: 'Швея' },
  { value: 'qc', label: 'ОТК' },
  { value: 'supervisor', label: 'Руководитель' },
  { value: 'seller', label: 'Продавец' },
  { value: 'technologist', label: 'Технолог' },
  { value: 'cutter', label: 'Раскройщик' },
  { value: 'ironing', label: 'Утюжка' },
  { value: 'customer', label: 'Заказчик' },
]

// ============ Tab: Справочник ============
export function ReferencesTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ---- Products state ----
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState({
    name: '', article: '', sewerRate: 150, homeRate: 0, qcRate: 50, reworkRate: 80,
    isKit: false, kitComboColors: {} as Record<string, string[]>,
  })
  const [productSizes, setProductSizes] = useState<string[]>([])
  const [productColors, setProductColors] = useState<Array<{ color: string; colorHex: string }>>([])
  const [newSize, setNewSize] = useState('')
  const [newColor, setNewColor] = useState('')
  const [newColorHex, setNewColorHex] = useState('#9ca3af')
  const [newKitKey, setNewKitKey] = useState('')
  const [newKitValue, setNewKitValue] = useState('')

  // ---- Employees state ----
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [employeeForm, setEmployeeForm] = useState({ name: '', code: '', username: '', password: '', role: 'sewer', customerId: '' as string })

  // ---- Cities state ----
  const [newCity, setNewCity] = useState('')

  // ---- Box types state ----
  const [newBoxName, setNewBoxName] = useState('')
  const [newBoxDimensions, setNewBoxDimensions] = useState('')
  const [newCapacities, setNewCapacities] = useState<Array<{ productId: string; size: string; maxQty: number }>>([])
  const [boxDialogOpen, setBoxDialogOpen] = useState(false)

  // ---- Customers state ----
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<{ id: string; name: string; contactInfo: string; customerProducts: Array<{ id: string; productId: string; customBoxCapacity: number | null; customWeight: number | null; customDimensions: string | null; customWidth: number | null; customHeight: number | null; product: { id: string; name: string; article: string } }> } | null>(null)
  const [customerForm, setCustomerForm] = useState({ name: '', contactInfo: '' })
  const [customerProducts, setCustomerProducts] = useState<Array<{ productId: string; customBoxCapacity: string; customWeight: string; customDimensions: string; customWidth: string; customHeight: string }>>([])
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null)

  // ---- Materials state ----
  const [newMaterialTypeName, setNewMaterialTypeName] = useState('')
  const [newMaterialTypeUnit, setNewMaterialTypeUnit] = useState('шт')
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false)
  const [materialForm, setMaterialForm] = useState({ name: '', materialTypeId: '', totalQty: 0, unit: '' })
  const [materialDetailDialogOpen, setMaterialDetailDialogOpen] = useState(false)
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null)
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [entryForm, setEntryForm] = useState<{ materialId: string; type: 'incoming' | 'consumed'; qty: string; date: string; cuttingPlanId: string; note: string }>({ materialId: '', type: 'incoming', qty: '', date: new Date().toISOString().slice(0, 10), cuttingPlanId: '', note: '' })
  const [normDialogOpen, setNormDialogOpen] = useState(false)
  const [normForm, setNormForm] = useState<{ materialId: string; productId: string; consumptionPerUnit: string; unit: string }>({ materialId: '', productId: '', consumptionPerUnit: '', unit: 'гр' })

  // ---- Queries ----
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetch('/api/products').then((r) => r.json()),
  })
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => fetch('/api/employees').then((r) => r.json()),
  })
  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ['cities'],
    queryFn: () => fetch('/api/cities').then((r) => r.json()),
  })
  const { data: boxTypes = [], isLoading: boxTypesLoading } = useQuery({
    queryKey: ['box-types'],
    queryFn: () => fetch('/api/box-types').then((r) => r.json()),
  })
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetch('/api/customers').then((r) => r.json()),
  })
  const { data: materialTypes = [], isLoading: materialTypesLoading } = useQuery({
    queryKey: ['material-types'],
    queryFn: () => fetch('/api/material-types').then((r) => r.json()),
  })
  const { data: materials = [], isLoading: materialsLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: () => fetch('/api/materials').then((r) => r.json()),
  })
  const { data: cuttingPlans = [] } = useQuery({
    queryKey: ['cutting-plans'],
    queryFn: () => fetch('/api/cutting-plans').then((r) => r.json()),
  })

  // ---- Product mutations ----
  const createProductMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); closeProductDialog(); toast({ title: 'Изделие создано' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => fetch(`/api/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); closeProductDialog(); toast({ title: 'Изделие обновлено' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/products/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast({ title: 'Изделие удалено' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить изделие', variant: 'destructive' }) },
  })

  // ---- Employee mutations ----
  const createEmployeeMutation = useMutation({
    mutationFn: (data: Record<string, string>) => fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); closeEmployeeDialog(); toast({ title: 'Сотрудник добавлен' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, string> }) => fetch(`/api/employees/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); closeEmployeeDialog(); toast({ title: 'Сотрудник обновлён' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/employees/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); toast({ title: 'Сотрудник удалён' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить сотрудника', variant: 'destructive' }) },
  })

  // ---- City mutations ----
  const createCityMutation = useMutation({
    mutationFn: (name: string) => fetch('/api/cities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cities'] }); setNewCity(''); toast({ title: 'Город добавлен' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось добавить город', variant: 'destructive' }) },
  })
  const deleteCityMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/cities/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cities'] }); toast({ title: 'Город удалён' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить город', variant: 'destructive' }) },
  })

  // ---- Box type mutations ----
  const createBoxTypeMutation = useMutation({
    mutationFn: (data: { name: string; dimensions?: string; capacities?: Array<{ productId: string; size: string; maxQty: number }> }) =>
      fetch('/api/box-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['box-types'] }); setBoxDialogOpen(false); setNewBoxName(''); setNewBoxDimensions(''); setNewCapacities([]); toast({ title: 'Тип короба добавлен' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось добавить тип короба', variant: 'destructive' }) },
  })
  const deleteBoxTypeMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/box-types/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['box-types'] }); toast({ title: 'Тип короба удалён' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить тип короба', variant: 'destructive' }) },
  })

  // ---- Customer mutations ----
  const createCustomerMutation = useMutation({
    mutationFn: (data: { name: string; contactInfo?: string; addProducts?: Array<{ productId: string; customBoxCapacity?: number; customWeight?: number; customDimensions?: string; customWidth?: number; customHeight?: number }> }) =>
      fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); closeCustomerDialog(); toast({ title: 'Заказчик создан' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      fetch(`/api/customers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); closeCustomerDialog(); toast({ title: 'Заказчик обновлён' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/customers/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); toast({ title: 'Заказчик удалён' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить заказчика', variant: 'destructive' }) },
  })

  // ---- Material type mutations ----
  const createMaterialTypeMutation = useMutation({
    mutationFn: (data: { name: string; unit?: string }) =>
      fetch('/api/material-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['material-types'] }); setNewMaterialTypeName(''); setNewMaterialTypeUnit('шт'); toast({ title: 'Тип материала добавлен' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const deleteMaterialTypeMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/material-types/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['material-types'] }); toast({ title: 'Тип материала удалён' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить тип материала', variant: 'destructive' }) },
  })

  // ---- Material mutations ----
  const createMaterialMutation = useMutation({
    mutationFn: (data: { name: string; materialTypeId: string; totalQty?: number; unit?: string }) =>
      fetch('/api/materials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); setMaterialDialogOpen(false); setMaterialForm({ name: '', materialTypeId: '', totalQty: 0, unit: '' }); toast({ title: 'Материал добавлен' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const deleteMaterialMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/materials/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); setMaterialDetailDialogOpen(false); toast({ title: 'Материал удалён' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить материал', variant: 'destructive' }) },
  })

  // ---- Material entry mutations ----
  const createEntryMutation = useMutation({
    mutationFn: (data: { materialId: string; type: string; qty: number; date?: string; cuttingPlanId?: string; note?: string }) =>
      fetch('/api/material-entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); queryClient.invalidateQueries({ queryKey: ['material-norms'] }); setEntryDialogOpen(false); setEntryForm({ materialId: '', type: 'incoming', qty: '', date: new Date().toISOString().slice(0, 10), cuttingPlanId: '', note: '' }); toast({ title: 'Запись добавлена' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/material-entries/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); toast({ title: 'Запись удалена' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить запись', variant: 'destructive' }) },
  })

  // ---- Material norm mutations ----
  const createNormMutation = useMutation({
    mutationFn: (data: { materialId: string; productId: string; consumptionPerUnit: number; unit?: string }) =>
      fetch('/api/material-norms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); queryClient.invalidateQueries({ queryKey: ['material-norms'] }); setNormDialogOpen(false); setNormForm({ materialId: '', productId: '', consumptionPerUnit: '', unit: 'гр' }); toast({ title: 'Норма расхода сохранена' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const deleteNormMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/material-norms/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['materials'] }); queryClient.invalidateQueries({ queryKey: ['material-norms'] }); toast({ title: 'Норма удалена' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить норму', variant: 'destructive' }) },
  })

  // ---- Customer dialog helpers ----
  const openCreateCustomer = useCallback(() => {
    setEditingCustomer(null)
    setCustomerForm({ name: '', contactInfo: '' })
    setCustomerProducts([])
    setCustomerDialogOpen(true)
  }, [])

  const openEditCustomer = useCallback((c: { id: string; name: string; contactInfo: string; customerProducts: Array<{ id: string; productId: string; customBoxCapacity: number | null; customWeight: number | null; customDimensions: string | null; customWidth: number | null; customHeight: number | null; product: { id: string; name: string; article: string } }> }) => {
    setEditingCustomer(c)
    setCustomerForm({ name: c.name, contactInfo: c.contactInfo || '' })
    setCustomerProducts(c.customerProducts.map(cp => ({
      productId: cp.productId,
      customBoxCapacity: cp.customBoxCapacity != null ? String(cp.customBoxCapacity) : '',
      customWeight: cp.customWeight != null ? String(cp.customWeight) : '',
      customDimensions: cp.customDimensions || '',
      customWidth: cp.customWidth != null ? String(cp.customWidth) : '',
      customHeight: cp.customHeight != null ? String(cp.customHeight) : '',
    })))
    setCustomerDialogOpen(true)
  }, [])

  const closeCustomerDialog = useCallback(() => { setCustomerDialogOpen(false); setEditingCustomer(null) }, [])

  const addCustomerProductRow = useCallback(() => {
    setCustomerProducts(prev => [...prev, { productId: '', customBoxCapacity: '', customWeight: '', customDimensions: '', customWidth: '', customHeight: '' }])
  }, [])

  const removeCustomerProductRow = useCallback((index: number) => {
    setCustomerProducts(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateCustomerProduct = useCallback((index: number, field: string, value: string) => {
    setCustomerProducts(prev => prev.map((cp, i) => i === index ? { ...cp, [field]: value } : cp))
  }, [])

  const handleSaveCustomer = useCallback(() => {
    if (!customerForm.name.trim()) {
      toast({ title: 'Ошибка', description: 'Укажите название заказчика', variant: 'destructive' }); return
    }
    const validProducts = customerProducts.filter(cp => cp.productId)
    const addProducts = validProducts.map(cp => ({
      productId: cp.productId,
      customBoxCapacity: cp.customBoxCapacity ? parseInt(cp.customBoxCapacity) || null : null,
      customWeight: cp.customWeight ? parseFloat(cp.customWeight) || null : null,
      customDimensions: cp.customDimensions || null,
      customWidth: cp.customWidth ? parseFloat(cp.customWidth) || null : null,
      customHeight: cp.customHeight ? parseFloat(cp.customHeight) || null : null,
    }))

    if (editingCustomer) {
      // For update, we need to figure out which products to add, remove, and update
      const existingProductIds = new Set(editingCustomer.customerProducts.map(cp => cp.productId))
      const newProductIds = new Set(validProducts.map(cp => cp.productId))

      const toAdd = addProducts.filter(p => !existingProductIds.has(p.productId))
      const toRemove = editingCustomer.customerProducts
        .filter(cp => !newProductIds.has(cp.productId))
        .map(cp => cp.productId)
      const toUpdate = addProducts.filter(p => existingProductIds.has(p.productId))

      updateCustomerMutation.mutate({
        id: editingCustomer.id,
        data: {
          name: customerForm.name,
          contactInfo: customerForm.contactInfo || null,
          addProducts: toAdd.length > 0 ? toAdd : undefined,
          removeProducts: toRemove.length > 0 ? toRemove : undefined,
          updateProducts: toUpdate.length > 0 ? toUpdate : undefined,
        }
      })
    } else {
      createCustomerMutation.mutate({
        name: customerForm.name,
        contactInfo: customerForm.contactInfo || undefined,
        addProducts: addProducts.length > 0 ? addProducts : undefined,
      })
    }
  }, [customerForm, customerProducts, editingCustomer, createCustomerMutation, updateCustomerMutation, toast])

  // ---- Product dialog helpers ----
  const openCreateProduct = useCallback(() => {
    setEditingProduct(null)
    setProductForm({ name: '', article: '', sewerRate: 150, homeRate: 0, qcRate: 50, reworkRate: 80, isKit: false, kitComboColors: {} })
    setProductSizes([])
    setProductColors([])
    setNewSize('')
    setNewColor('')
    setNewColorHex('#9ca3af')
    setNewKitKey('')
    setNewKitValue('')
    setProductDialogOpen(true)
  }, [])

  const openEditProduct = useCallback((p: Product) => {
    setEditingProduct(p)
    let parsedKitComboColors: Record<string, string[]> = {}
    if (p.kitComboColors) {
      try {
        if (typeof p.kitComboColors === 'string') {
          parsedKitComboColors = JSON.parse(p.kitComboColors)
        } else {
          parsedKitComboColors = p.kitComboColors as Record<string, string[]>
        }
      } catch { parsedKitComboColors = {} }
    }
    setProductForm({ name: p.name, article: p.article, sewerRate: p.sewerRate, homeRate: p.homeRate, qcRate: p.qcRate, reworkRate: p.reworkRate, isKit: p.isKit, kitComboColors: parsedKitComboColors })
    setProductSizes(sortSizes(p.sizes.map(s => s.size)))
    setProductColors(p.colors.map(c => ({ color: c.color, colorHex: c.colorHex })))
    setNewSize('')
    setNewColor('')
    setNewColorHex('#9ca3af')
    setNewKitKey('')
    setNewKitValue('')
    setProductDialogOpen(true)
  }, [])

  const closeProductDialog = useCallback(() => { setProductDialogOpen(false); setEditingProduct(null) }, [])

  const handleSaveProduct = useCallback(() => {
    if (!productForm.name.trim() || !productForm.article.trim()) {
      toast({ title: 'Ошибка', description: 'Заполните название и артикул', variant: 'destructive' }); return
    }
    const data: Record<string, unknown> = {
      name: productForm.name,
      article: productForm.article,
      sewerRate: productForm.sewerRate,
      homeRate: productForm.homeRate,
      qcRate: productForm.qcRate,
      reworkRate: productForm.reworkRate,
      isKit: productForm.isKit,
      kitComboColors: productForm.isKit ? productForm.kitComboColors : null,
      sizes: productSizes,
      colors: productColors,
    }
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data })
    } else {
      createProductMutation.mutate(data)
    }
  }, [productForm, productSizes, productColors, editingProduct, updateProductMutation, createProductMutation, toast])

  const applySizeGrid = useCallback((gridLabel: string) => {
    const grid = STANDARD_SIZE_GRIDS.find(g => g.label === gridLabel)
    if (!grid) return
    setProductSizes(prev => {
      const merged = new Set([...prev, ...grid.sizes])
      return sortSizes(Array.from(merged))
    })
  }, [])

  const addProductSize = useCallback(() => {
    if (!newSize.trim()) return
    setProductSizes(prev => {
      if (prev.includes(newSize.trim())) return prev
      return sortSizes([...prev, newSize.trim()])
    })
    setNewSize('')
  }, [newSize])

  const removeProductSize = useCallback((size: string) => {
    setProductSizes(prev => prev.filter(s => s !== size))
  }, [])

  const moveSizeUp = useCallback((index: number) => {
    if (index <= 0) return
    setProductSizes(prev => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }, [])

  const moveSizeDown = useCallback((index: number) => {
    setProductSizes(prev => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }, [])

  const applyStandardColor = useCallback((colorName: string, hex: string) => {
    setProductColors(prev => {
      if (prev.find(c => c.color === colorName)) return prev
      return [...prev, { color: colorName, colorHex: hex }]
    })
  }, [])

  const addProductColor = useCallback(() => {
    if (!newColor.trim()) return
    setProductColors(prev => prev.find(c => c.color === newColor.trim()) ? prev : [...prev, { color: newColor.trim(), colorHex: newColorHex }])
    setNewColor('')
    setNewColorHex('#9ca3af')
  }, [newColor, newColorHex])

  const removeProductColor = useCallback((color: string) => {
    setProductColors(prev => prev.filter(c => c.color !== color))
  }, [])

  const toggleIsKit = useCallback((checked: boolean) => {
    setProductForm(prev => ({
      ...prev,
      isKit: checked,
      kitComboColors: checked ? (Object.keys(prev.kitComboColors).length === 0 ? {} : prev.kitComboColors) : {},
    }))
  }, [])

  const addKitCombo = useCallback(() => {
    if (!newKitKey.trim()) return
    const values = newKitValue.trim() ? newKitValue.split(',').map(v => v.trim()).filter(Boolean) : []
    setProductForm(prev => ({ ...prev, kitComboColors: { ...prev.kitComboColors, [newKitKey.trim()]: values } }))
    setNewKitKey('')
    setNewKitValue('')
  }, [newKitKey, newKitValue])

  const removeKitCombo = useCallback((key: string) => {
    setProductForm(prev => {
      const next = { ...prev.kitComboColors }
      delete next[key]
      return { ...prev, kitComboColors: next }
    })
  }, [])

  // ---- Employee dialog helpers ----
  const openCreateEmployee = useCallback(() => {
    setEditingEmployee(null)
    setEmployeeForm({ name: '', code: '', username: '', password: '', role: 'sewer', customerId: '' })
    setEmployeeDialogOpen(true)
  }, [])

  const openEditEmployee = useCallback((e: Employee) => {
    setEditingEmployee(e)
    setEmployeeForm({ name: e.name, code: e.code, username: e.username, password: '', role: e.role, customerId: e.customerId || '' })
    setEmployeeDialogOpen(true)
  }, [])

  const closeEmployeeDialog = useCallback(() => { setEmployeeDialogOpen(false); setEditingEmployee(null) }, [])

  const handleSaveEmployee = useCallback(() => {
    if (!employeeForm.name.trim() || !employeeForm.code.trim()) {
      toast({ title: 'Ошибка', description: 'Заполните ФИО и код', variant: 'destructive' }); return
    }
    if (!editingEmployee && (!employeeForm.username.trim() || !employeeForm.password.trim())) {
      toast({ title: 'Ошибка', description: 'Заполните логин и пароль', variant: 'destructive' }); return
    }
    const data: Record<string, string> = { name: employeeForm.name, code: employeeForm.code, role: employeeForm.role }
    if (employeeForm.username) data.username = employeeForm.username
    if (employeeForm.password) data.password = employeeForm.password
    if (employeeForm.customerId) data.customerId = employeeForm.customerId
    if (editingEmployee) {
      updateEmployeeMutation.mutate({ id: editingEmployee.id, data })
    } else {
      data.username = employeeForm.username
      data.password = employeeForm.password
      createEmployeeMutation.mutate(data)
    }
  }, [employeeForm, editingEmployee, updateEmployeeMutation, createEmployeeMutation, toast])

  // ---- Loading state ----
  if (productsLoading || employeesLoading || citiesLoading || boxTypesLoading || customersLoading || materialTypesLoading || materialsLoading) {
    return (<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /><span className="ml-2 text-muted-foreground">Загрузка...</span></div>)
  }

  const getRoleLabel = (role: string) => EMPLOYEE_ROLES.find(r => r.value === role)?.label || role

  return (
    <div className="space-y-8">
      {/* ===== ИЗДЕЛИЯ ===== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2"><Grid3X3 className="h-5 w-5 text-emerald-500" />Изделия</h3>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openCreateProduct}><Plus className="h-4 w-4 mr-1" />Добавить изделие</Button>
        </div>
        {products.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground">Нет изделий. Добавьте первое изделие.</CardContent></Card>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Артикул</TableHead>
                    <TableHead>Размеры</TableHead>
                    <TableHead>Цвета</TableHead>
                    <TableHead>Ставки</TableHead>
                    <TableHead>Комплект</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(products as Array<Product & { kitComboColors?: string | Record<string, string[]> }>).map((p) => {
                    let parsedKit: Record<string, string[]> | null = null
                    if (p.isKit && p.kitComboColors) {
                      try { parsedKit = typeof p.kitComboColors === 'string' ? JSON.parse(p.kitComboColors) : p.kitComboColors } catch { parsedKit = null }
                    }
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium max-w-[180px]">{p.name}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{p.article}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {[...p.sizes].sort((a, b) => { const ai = SIZE_ORDER_MAP.get(a.size); const bi = SIZE_ORDER_MAP.get(b.size); if (ai !== undefined && bi !== undefined) return ai - bi; if (ai !== undefined) return -1; if (bi !== undefined) return 1; return a.size.localeCompare(b.size, undefined, { numeric: true }) }).map(s => <Badge key={s.id} variant="outline" className="text-xs">{s.size}</Badge>)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {p.colors.map(c => <Badge key={c.id} variant="outline" className="text-xs gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full border border-gray-200" style={{ backgroundColor: c.colorHex }} />{c.color}</Badge>)}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          <div>Шв: {p.sewerRate} | Над: {p.homeRate}</div>
                          <div>ОТК: {p.qcRate} | Пер: {p.reworkRate}</div>
                        </TableCell>
                        <TableCell>
                          {p.isKit ? (
                            <div className="space-y-0.5">
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs">Комплект</Badge>
                              {parsedKit && Object.entries(parsedKit).map(([k, v]) => (
                                <div key={k} className="text-xs text-muted-foreground">{k} → [{v.join(', ')}]</div>
                              ))}
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => openEditProduct(p as unknown as Product)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteProductMutation.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* ===== СОТРУДНИКИ ===== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-emerald-500" />Сотрудники</h3>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openCreateEmployee}><Plus className="h-4 w-4 mr-1" />Добавить сотрудника</Button>
        </div>
        {employees.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground">Нет сотрудников</CardContent></Card>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ФИО</TableHead>
                    <TableHead>Код</TableHead>
                    <TableHead>Логин</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(employees as Employee[]).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell className="text-muted-foreground">{e.code}</TableCell>
                      <TableCell className="text-muted-foreground">{e.username}</TableCell>
                      <TableCell><Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">{getRoleLabel(e.role)}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => openEditEmployee(e)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteEmployeeMutation.mutate(e.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* ===== ГОРОДА ===== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2"><MapPin className="h-5 w-5 text-emerald-500" />Города</h3>
        </div>
        <div className="flex gap-2 mb-3">
          <Input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="Название города" onKeyDown={(e) => { if (e.key === 'Enter' && newCity.trim()) { createCityMutation.mutate(newCity.trim()) } }} />
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { if (newCity.trim()) createCityMutation.mutate(newCity.trim()) }} disabled={createCityMutation.isPending}><Plus className="h-4 w-4 mr-1" />Добавить</Button>
        </div>
        {cities.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-6 text-center text-muted-foreground text-sm">Нет городов</CardContent></Card>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cities.map((city: { id: string; name: string }) => (
              <Badge key={city.id} variant="secondary" className="gap-1 py-1.5 px-3">
                {city.name}
                <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => deleteCityMutation.mutate(city.id)} />
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* ===== ТИПЫ КОРОБОВ ===== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2"><Package className="h-5 w-5 text-emerald-500" />Типы коробов</h3>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setNewBoxName(''); setNewBoxDimensions(''); setNewCapacities([]); setBoxDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" />Добавить</Button>
        </div>
        {boxTypes.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-6 text-center text-muted-foreground text-sm">Нет типов коробов</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {boxTypes.map((bt: { id: string; name: string; dimensions: string | null; capacities: Array<{ id: string; productId: string; size: string; maxQty: number; product?: { name: string } }> }) => (
              <Card key={bt.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{bt.name}</span>
                    {bt.dimensions && <span className="text-sm text-muted-foreground ml-2">({bt.dimensions})</span>}
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteBoxTypeMutation.mutate(bt.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                {bt.capacities.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {bt.capacities.map((cap) => (
                      <Badge key={cap.id} variant="outline" className="text-xs">
                        {cap.product?.name || cap.productId} / {cap.size}: {cap.maxQty} шт
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* ===== ЗАКАЗЧИКИ ===== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2"><Store className="h-5 w-5 text-emerald-500" />Заказчики</h3>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openCreateCustomer}><Plus className="h-4 w-4 mr-1" />Добавить заказчика</Button>
        </div>
        {customers.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground">Нет заказчиков</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {(customers as Array<{ id: string; name: string; contactInfo: string | null; customerProducts: Array<{ id: string; productId: string; customBoxCapacity: number | null; customWeight: number | null; customDimensions: string | null; customWidth: number | null; customHeight: number | null; product: { id: string; name: string; article: string } }>; _count: { employees: number } }>).map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                      onClick={() => setExpandedCustomerId(prev => prev === c.id ? null : c.id)}
                    >
                      {expandedCustomerId === c.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                    <div>
                      <span className="font-medium">{c.name}</span>
                      {c.contactInfo && <span className="text-sm text-muted-foreground ml-2">({c.contactInfo})</span>}
                      <Badge variant="secondary" className="ml-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 text-xs">
                        {c.customerProducts.length} изд.
                      </Badge>
                      {c._count.employees > 0 && (
                        <Badge variant="secondary" className="ml-1 bg-sky-50 text-sky-700 hover:bg-sky-50 text-xs">
                          {c._count.employees} сотр.
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => openEditCustomer(c as unknown as typeof editingCustomer)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteCustomerMutation.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                {expandedCustomerId === c.id && c.customerProducts.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Каталог изделий заказчика:</p>
                    <div className="space-y-1">
                      {c.customerProducts.map((cp) => (
                        <div key={cp.id} className="flex items-center gap-2 text-sm bg-gray-50 rounded p-2">
                          <span className="font-medium">{cp.product.name}</span>
                          <span className="text-muted-foreground">({cp.product.article})</span>
                          {cp.customBoxCapacity != null && <Badge variant="outline" className="text-xs">Короб: {cp.customBoxCapacity} шт</Badge>}
                          {cp.customWeight != null && <Badge variant="outline" className="text-xs">Вес: {cp.customWeight} гр</Badge>}
                          {cp.customDimensions && <Badge variant="outline" className="text-xs">Габ: {cp.customDimensions}</Badge>}
                          {cp.customWidth != null && <Badge variant="outline" className="text-xs">Ш: {cp.customWidth} см</Badge>}
                          {cp.customHeight != null && <Badge variant="outline" className="text-xs">В: {cp.customHeight} см</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {expandedCustomerId === c.id && c.customerProducts.length === 0 && (
                  <div className="mt-3 pt-3 border-t text-sm text-muted-foreground">
                    Нет изделий в каталоге заказчика
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* ===== МАТЕРИАЛЫ ===== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2"><Boxes className="h-5 w-5 text-emerald-500" />Материалы</h3>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setMaterialForm({ name: '', materialTypeId: '', totalQty: 0, unit: '' }); setMaterialDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" />Добавить материал</Button>
        </div>

        {/* Material Types */}
        <div className="mb-4">
          <Label className="text-sm font-medium mb-2 block">Типы материалов</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(materialTypes as Array<{ id: string; name: string; unit: string; _count: { materials: number } }>).map((mt) => (
              <Badge key={mt.id} variant="secondary" className="gap-1 py-1.5 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 group">
                {mt.name} <span className="text-emerald-400">({mt.unit})</span> <span className="text-emerald-500 text-xs">[{mt._count.materials}]</span>
                <button type="button" className="inline-flex items-center justify-center rounded-sm p-0.5 -mr-1 hover:bg-red-100 hover:text-red-600 transition-colors" onClick={() => deleteMaterialTypeMutation.mutate(mt.id)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {materialTypes.length === 0 && <span className="text-xs text-muted-foreground">Нет типов материалов</span>}
          </div>
          <div className="flex gap-2 items-end">
            <div className="w-40"><Input value={newMaterialTypeName} onChange={(e) => setNewMaterialTypeName(e.target.value)} placeholder="Название" onKeyDown={(e) => { if (e.key === 'Enter' && newMaterialTypeName.trim()) createMaterialTypeMutation.mutate({ name: newMaterialTypeName, unit: newMaterialTypeUnit }) }} /></div>
            <Select value={newMaterialTypeUnit} onValueChange={setNewMaterialTypeUnit}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="шт">шт</SelectItem>
                <SelectItem value="кг">кг</SelectItem>
                <SelectItem value="гр">гр</SelectItem>
                <SelectItem value="м">м</SelectItem>
                <SelectItem value="см">см</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => { if (newMaterialTypeName.trim()) createMaterialTypeMutation.mutate({ name: newMaterialTypeName, unit: newMaterialTypeUnit }) }} disabled={createMaterialTypeMutation.isPending}>
              {createMaterialTypeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Materials Table */}
        {(materials as Array<{ id: string; name: string; totalQty: number; unit: string; materialTypeId: string; materialType: { id: string; name: string; unit: string }; entries: Array<{ id: string; type: string; qty: number; date: string; cuttingPlanId: string | null; note: string | null }>; norms: Array<{ id: string; materialId: string; productId: string; consumptionPerUnit: number; unit: string; autoCalculated: boolean; product: { id: string; name: string; article: string } }> }>).length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground">Нет материалов</CardContent></Card>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Остаток</TableHead>
                    <TableHead>Ед.</TableHead>
                    <TableHead>Норм</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(materials as Array<{ id: string; name: string; totalQty: number; unit: string; materialTypeId: string; materialType: { id: string; name: string; unit: string }; entries: Array<{ id: string; type: string; qty: number; date: string; cuttingPlanId: string | null; note: string | null }>; norms: Array<{ id: string; materialId: string; productId: string; consumptionPerUnit: number; unit: string; autoCalculated: boolean; product: { id: string; name: string; article: string } }> }>).map((m) => (
                    <TableRow key={m.id} className="cursor-pointer hover:bg-emerald-50/50" onClick={() => { setSelectedMaterialId(m.id); setMaterialDetailDialogOpen(true) }}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{m.materialType.name}</Badge></TableCell>
                      <TableCell className={m.totalQty <= 0 ? 'text-red-500 font-semibold' : ''}>{m.totalQty}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{m.unit}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs bg-sky-50 text-sky-700 hover:bg-sky-50">{m.norms.length}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); deleteMaterialMutation.mutate(m.id) }}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* ===== MATERIAL DETAIL DIALOG ===== */}
      <Dialog open={materialDetailDialogOpen} onOpenChange={(open) => { if (!open) { setMaterialDetailDialogOpen(false); setSelectedMaterialId(null) } }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Детали материала</DialogTitle></DialogHeader>
          {selectedMaterialId && (() => {
            const mat = (materials as Array<{ id: string; name: string; totalQty: number; unit: string; materialTypeId: string; materialType: { id: string; name: string; unit: string }; entries: Array<{ id: string; type: string; qty: number; date: string; cuttingPlanId: string | null; note: string | null; createdAt: string }>; norms: Array<{ id: string; materialId: string; productId: string; consumptionPerUnit: number; unit: string; autoCalculated: boolean; product: { id: string; name: string; article: string } }> }>).find(m => m.id === selectedMaterialId)
            if (!mat) return null
            return (
              <ScrollArea className="max-h-[75vh] pr-4">
                <div className="space-y-4">
                  {/* Stock info */}
                  <div className="grid grid-cols-3 gap-3">
                    <Card className="p-3 text-center"><div className="text-xs text-muted-foreground">Название</div><div className="font-semibold text-sm">{mat.name}</div></Card>
                    <Card className="p-3 text-center"><div className="text-xs text-muted-foreground">Тип</div><div className="font-semibold text-sm">{mat.materialType.name}</div></Card>
                    <Card className={`p-3 text-center ${mat.totalQty <= 0 ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
                      <div className="text-xs text-muted-foreground">Остаток</div>
                      <div className={`text-lg font-bold ${mat.totalQty <= 0 ? 'text-red-600' : 'text-emerald-700'}`}>{mat.totalQty} {mat.unit}</div>
                    </Card>
                  </div>

                  <Separator />

                  {/* Entry history */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">История движений</Label>
                      <Button size="sm" variant="outline" onClick={() => { setEntryForm(p => ({ ...p, materialId: mat.id })); setEntryDialogOpen(true) }}>
                        <Plus className="h-4 w-4 mr-1" />Добавить запись
                      </Button>
                    </div>
                    {mat.entries.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Нет записей</p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Дата</TableHead>
                              <TableHead className="text-xs">Тип</TableHead>
                              <TableHead className="text-xs">Кол-во</TableHead>
                              <TableHead className="text-xs">Примечание</TableHead>
                              <TableHead className="text-xs w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {mat.entries.map((e) => (
                              <TableRow key={e.id}>
                                <TableCell className="text-xs">{new Date(e.date || e.createdAt).toLocaleDateString('ru-RU')}</TableCell>
                                <TableCell className="text-xs">
                                  {e.type === 'incoming' ? (
                                    <span className="flex items-center gap-1 text-emerald-600"><ArrowDownCircle className="h-3 w-3" />Приход</span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-red-600"><ArrowUpCircle className="h-3 w-3" />Расход</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs font-medium">{e.qty} {mat.unit}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{e.note || '—'}</TableCell>
                                <TableCell>
                                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 p-0 h-6 w-6" onClick={() => deleteEntryMutation.mutate(e.id)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Norms */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Нормы расхода</Label>
                      <Button size="sm" variant="outline" onClick={() => { setNormForm(p => ({ ...p, materialId: mat.id, unit: mat.unit })); setNormDialogOpen(true) }}>
                        <Plus className="h-4 w-4 mr-1" />Добавить норму
                      </Button>
                    </div>
                    {mat.norms.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Нормы расхода не заданы</p>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Изделие</TableHead>
                              <TableHead className="text-xs">Расход на ед.</TableHead>
                              <TableHead className="text-xs">Ед.</TableHead>
                              <TableHead className="text-xs">Авто</TableHead>
                              <TableHead className="text-xs w-10"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {mat.norms.map((n) => (
                              <TableRow key={n.id}>
                                <TableCell className="text-xs font-medium">{n.product.name} ({n.product.article})</TableCell>
                                <TableCell className="text-xs">{n.consumptionPerUnit}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{n.unit}</TableCell>
                                <TableCell className="text-xs">
                                  {n.autoCalculated ? (
                                    <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 hover:bg-amber-50"><Calculator className="h-3 w-3 mr-1" />Авто</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-500 hover:bg-gray-100">Вручную</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 p-0 h-6 w-6" onClick={() => deleteNormMutation.mutate(n.id)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ===== ADD MATERIAL DIALOG ===== */}
      <Dialog open={materialDialogOpen} onOpenChange={setMaterialDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Новый материал</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название *</Label>
              <Input value={materialForm.name} onChange={(e) => setMaterialForm(p => ({ ...p, name: e.target.value }))} placeholder="Кулирка хлопок 100%" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Тип материала *</Label>
                <Select value={materialForm.materialTypeId} onValueChange={(v) => {
                  const mt = (materialTypes as Array<{ id: string; name: string; unit: string }>).find(t => t.id === v)
                  setMaterialForm(p => ({ ...p, materialTypeId: v, unit: mt?.unit || 'шт' }))
                }}>
                  <SelectTrigger><SelectValue placeholder="Выберите тип" /></SelectTrigger>
                  <SelectContent>
                    {(materialTypes as Array<{ id: string; name: string; unit: string }>).map((mt) => (
                      <SelectItem key={mt.id} value={mt.id}>{mt.name} ({mt.unit})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ед. изм.</Label>
                <Select value={materialForm.unit} onValueChange={(v) => setMaterialForm(p => ({ ...p, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="шт">шт</SelectItem>
                    <SelectItem value="кг">кг</SelectItem>
                    <SelectItem value="гр">гр</SelectItem>
                    <SelectItem value="м">м</SelectItem>
                    <SelectItem value="см">см</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Начальный остаток</Label>
              <Input type="number" min="0" step="0.01" value={materialForm.totalQty || ''} onChange={(e) => setMaterialForm(p => ({ ...p, totalQty: parseFloat(e.target.value) || 0 }))} placeholder="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaterialDialogOpen(false)}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={createMaterialMutation.isPending} onClick={() => {
              if (!materialForm.name.trim()) { toast({ title: 'Ошибка', description: 'Укажите название', variant: 'destructive' }); return }
              if (!materialForm.materialTypeId) { toast({ title: 'Ошибка', description: 'Выберите тип материала', variant: 'destructive' }); return }
              createMaterialMutation.mutate({
                name: materialForm.name,
                materialTypeId: materialForm.materialTypeId,
                totalQty: materialForm.totalQty || undefined,
                unit: materialForm.unit || undefined,
              })
            }}>
              {createMaterialMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== ADD ENTRY DIALOG ===== */}
      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Добавить движение</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Тип *</Label>
                <Select value={entryForm.type} onValueChange={(v) => setEntryForm(p => ({ ...p, type: v as 'incoming' | 'consumed' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incoming">Приход</SelectItem>
                    <SelectItem value="consumed">Расход</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Количество *</Label>
                <Input type="number" min="0.01" step="0.01" value={entryForm.qty} onChange={(e) => setEntryForm(p => ({ ...p, qty: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input type="date" value={entryForm.date} onChange={(e) => setEntryForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            {entryForm.type === 'consumed' && (
              <div className="space-y-2">
                <Label>План раскроя (опционально)</Label>
                <Select value={entryForm.cuttingPlanId} onValueChange={(v) => setEntryForm(p => ({ ...p, cuttingPlanId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Не привязан" /></SelectTrigger>
                  <SelectContent>
                    {(cuttingPlans as Array<{ id: string; plan: { name: string }; status: string }>).map((cp) => (
                      <SelectItem key={cp.id} value={cp.id}>{cp.plan?.name || 'План'} ({cp.status === 'cut' ? 'раскроен' : 'в работе'})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {entryForm.cuttingPlanId && (
                  <p className="text-xs text-amber-600 flex items-center gap-1"><Calculator className="h-3 w-3" />При наличии факт. данных раскроя норма расхода будет пересчитана автоматически</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Примечание</Label>
              <Input value={entryForm.note} onChange={(e) => setEntryForm(p => ({ ...p, note: e.target.value }))} placeholder="Опционально" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryDialogOpen(false)}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={createEntryMutation.isPending} onClick={() => {
              if (!entryForm.qty || parseFloat(entryForm.qty) <= 0) { toast({ title: 'Ошибка', description: 'Укажите количество', variant: 'destructive' }); return }
              createEntryMutation.mutate({
                materialId: entryForm.materialId,
                type: entryForm.type,
                qty: parseFloat(entryForm.qty),
                date: entryForm.date || undefined,
                cuttingPlanId: entryForm.cuttingPlanId || undefined,
                note: entryForm.note || undefined,
              })
            }}>
              {createEntryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== ADD NORM DIALOG ===== */}
      <Dialog open={normDialogOpen} onOpenChange={setNormDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Норма расхода</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Изделие *</Label>
              <Select value={normForm.productId} onValueChange={(v) => setNormForm(p => ({ ...p, productId: v }))}>
                <SelectTrigger><SelectValue placeholder="Выберите изделие" /></SelectTrigger>
                <SelectContent>
                  {(products as Product[]).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.article})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Расход на 1 ед. *</Label>
                <Input type="number" min="0" step="0.01" value={normForm.consumptionPerUnit} onChange={(e) => setNormForm(p => ({ ...p, consumptionPerUnit: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Ед. изм.</Label>
                <Select value={normForm.unit} onValueChange={(v) => setNormForm(p => ({ ...p, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="гр">гр</SelectItem>
                    <SelectItem value="кг">кг</SelectItem>
                    <SelectItem value="см">см</SelectItem>
                    <SelectItem value="м">м</SelectItem>
                    <SelectItem value="шт">шт</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNormDialogOpen(false)}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={createNormMutation.isPending} onClick={() => {
              if (!normForm.productId) { toast({ title: 'Ошибка', description: 'Выберите изделие', variant: 'destructive' }); return }
              if (!normForm.consumptionPerUnit || parseFloat(normForm.consumptionPerUnit) <= 0) { toast({ title: 'Ошибка', description: 'Укажите расход', variant: 'destructive' }); return }
              createNormMutation.mutate({
                materialId: normForm.materialId,
                productId: normForm.productId,
                consumptionPerUnit: parseFloat(normForm.consumptionPerUnit),
                unit: normForm.unit,
              })
            }}>
              {createNormMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== CUSTOMER DIALOG ===== */}
      <Dialog open={customerDialogOpen} onOpenChange={(open) => { if (!open) closeCustomerDialog(); else setCustomerDialogOpen(true) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader><DialogTitle>{editingCustomer ? 'Редактировать заказчика' : 'Новый заказчик'}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[75vh] pr-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Название *</Label><Input value={customerForm.name} onChange={(e) => setCustomerForm(p => ({ ...p, name: e.target.value }))} placeholder="ООО Компания" /></div>
                <div className="space-y-2"><Label>Контактная информация</Label><Input value={customerForm.contactInfo} onChange={(e) => setCustomerForm(p => ({ ...p, contactInfo: e.target.value }))} placeholder="Телефон, email" /></div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Изделия заказчика</Label>
                  <Button size="sm" variant="outline" onClick={addCustomerProductRow}><Plus className="h-4 w-4 mr-1" />Добавить изделие</Button>
                </div>
                <p className="text-xs text-muted-foreground">Добавьте изделия из глобального каталога и укажите кастомные параметры для заказчика (override)</p>
                <div className="space-y-2">
                  {customerProducts.map((cp, index) => {
                    const selectedProduct = products.find((p: Product) => p.id === cp.productId)
                    return (
                      <div key={index} className="border rounded-lg p-3 bg-gray-50 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <Select value={cp.productId} onValueChange={(v) => updateCustomerProduct(index, 'productId', v)}>
                              <SelectTrigger className="w-full"><SelectValue placeholder="Выберите изделие" /></SelectTrigger>
                              <SelectContent>
                                {products.map((p: Product) => (
                                  <SelectItem key={p.id} value={p.id}>{p.name} ({p.article})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0" onClick={() => removeCustomerProductRow(index)}><X className="h-4 w-4" /></Button>
                        </div>
                        {cp.productId && (
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Вмест. короб</Label>
                              <Input type="number" min="0" value={cp.customBoxCapacity} onChange={(e) => updateCustomerProduct(index, 'customBoxCapacity', e.target.value)} placeholder={selectedProduct ? '—' : ''} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Вес (гр)</Label>
                              <Input type="number" min="0" step="0.1" value={cp.customWeight} onChange={(e) => updateCustomerProduct(index, 'customWeight', e.target.value)} placeholder={selectedProduct ? '—' : ''} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Габариты</Label>
                              <Input value={cp.customDimensions} onChange={(e) => updateCustomerProduct(index, 'customDimensions', e.target.value)} placeholder="40x30x20" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Ширина (см)</Label>
                              <Input type="number" min="0" step="0.1" value={cp.customWidth} onChange={(e) => updateCustomerProduct(index, 'customWidth', e.target.value)} placeholder="—" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Высота (см)</Label>
                              <Input type="number" min="0" step="0.1" value={cp.customHeight} onChange={(e) => updateCustomerProduct(index, 'customHeight', e.target.value)} placeholder="—" />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {customerProducts.length === 0 && <span className="text-xs text-muted-foreground">Изделия не добавлены</span>}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={closeCustomerDialog}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveCustomer} disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}>
              {(createCustomerMutation.isPending || updateCustomerMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingCustomer ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== PRODUCT DIALOG ===== */}
      <Dialog open={productDialogOpen} onOpenChange={(open) => { if (!open) closeProductDialog(); else setProductDialogOpen(true) }}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh]">
          <DialogHeader><DialogTitle>{editingProduct ? 'Редактировать изделие' : 'Новое изделие'}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[75vh] pr-4">
            <div className="space-y-5">
              {/* Basic info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Название *</Label><Input value={productForm.name} onChange={(e) => setProductForm(p => ({ ...p, name: e.target.value }))} placeholder="Футболка женская" /></div>
                <div className="space-y-2"><Label>Артикул *</Label><Input value={productForm.article} onChange={(e) => setProductForm(p => ({ ...p, article: e.target.value }))} placeholder="ФЖ-01" /></div>
              </div>
              {/* Ставки — все считаются за единицу изделия, даже для комплектов (комплект в раскрое разбивается на единичные) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-2"><Label className="text-xs">Швея (за ед.)</Label><Input type="number" min="0" value={productForm.sewerRate || ''} onChange={(e) => setProductForm(p => ({ ...p, sewerRate: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><Label className="text-xs">Надомница (за ед.)</Label><Input type="number" min="0" value={productForm.homeRate || ''} onChange={(e) => setProductForm(p => ({ ...p, homeRate: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><Label className="text-xs">ОТК (за ед.)</Label><Input type="number" min="0" value={productForm.qcRate || ''} onChange={(e) => setProductForm(p => ({ ...p, qcRate: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><Label className="text-xs">Переделка (за ед.)</Label><Input type="number" min="0" value={productForm.reworkRate || ''} onChange={(e) => setProductForm(p => ({ ...p, reworkRate: parseFloat(e.target.value) || 0 }))} /></div>
              </div>

              <Separator />

              {/* Sizes */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-sm font-medium">Размеры</Label>
                  <Select onValueChange={applySizeGrid}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Применить сетку..." /></SelectTrigger>
                    <SelectContent>
                      {STANDARD_SIZE_GRIDS.map(g => <SelectItem key={g.label} value={g.label}>{g.label} ({g.sizes.join(', ')})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {productSizes.length > 0 && (
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs h-7 ml-auto" onClick={() => setProductSizes([])}>
                      <Trash2 className="h-3 w-3 mr-1" />Удалить все
                    </Button>
                  )}
                </div>
                {productSizes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {productSizes.map((size, idx) => (
                      <div key={size} className="flex items-center gap-0.5 bg-emerald-50 rounded-md border border-emerald-200 pr-1">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            className={`p-0 leading-none ${idx === 0 ? 'text-gray-300 cursor-default' : 'text-emerald-500 hover:text-emerald-700'}`}
                            onClick={() => moveSizeUp(idx)}
                            disabled={idx === 0}
                            title="Переместить вверх"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            className={`p-0 leading-none ${idx === productSizes.length - 1 ? 'text-gray-300 cursor-default' : 'text-emerald-500 hover:text-emerald-700'}`}
                            onClick={() => moveSizeDown(idx)}
                            disabled={idx === productSizes.length - 1}
                            title="Переместить вниз"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-medium text-emerald-700 px-1">{size}</span>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-sm p-0.5 hover:bg-red-100 hover:text-red-600 text-gray-400 transition-colors"
                          title={`Удалить размер ${size}`}
                          onClick={() => removeProductSize(size)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Размеры не добавлены — выберите сетку или введите вручную</span>
                )}
                <div className="flex gap-2">
                  <Input value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder="Новый размер" className="w-36" onKeyDown={(e) => { if (e.key === 'Enter') addProductSize() }} />
                  <Button size="sm" variant="outline" onClick={addProductSize}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              <Separator />

              {/* Colors */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-sm font-medium">Цвета</Label>
                  {productColors.length > 0 && (
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs h-7 ml-auto" onClick={() => setProductColors([])}>
                      <Trash2 className="h-3 w-3 mr-1" />Удалить все
                    </Button>
                  )}
                </div>
                {/* Standard colors */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Стандартные цвета — нажмите, чтобы добавить:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STANDARD_COLORS.map(sc => (
                      <button
                        key={sc.color}
                        type="button"
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border transition-colors ${productColors.find(c => c.color === sc.color) ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-gray-200 hover:border-emerald-300'}`}
                        onClick={() => applyStandardColor(sc.color, sc.hex)}
                      >
                        <span className="inline-block w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: sc.hex }} />
                        {sc.color}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Current colors */}
                {productColors.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {productColors.map(c => (
                      <div key={c.color} className="flex items-center gap-1 bg-emerald-50 rounded-md border border-emerald-200 py-1 px-2">
                        <span className="inline-block w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: c.colorHex }} />
                        <span className="text-sm font-medium text-emerald-700">{c.color}</span>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-sm p-0.5 hover:bg-red-100 hover:text-red-600 text-gray-400 transition-colors"
                          title={`Удалить цвет ${c.color}`}
                          onClick={() => removeProductColor(c.color)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Цвета не добавлены — выберите из списка или введите свой</span>
                )}
                {/* Custom color input */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1 max-w-[200px]"><Input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="Свой цвет" onKeyDown={(e) => { if (e.key === 'Enter') addProductColor() }} /></div>
                  <div className="flex items-center gap-1">
                    <input type="color" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)} className="w-7 h-8 rounded cursor-pointer border-0 p-0" />
                  </div>
                  <Button size="sm" variant="outline" onClick={addProductColor}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              <Separator />

              {/* Kit */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox checked={productForm.isKit} onCheckedChange={(checked) => toggleIsKit(checked === true)} id="isKit" />
                  <Label htmlFor="isKit" className="text-sm font-medium cursor-pointer">Комплект</Label>
                </div>
                {productForm.isKit && (
                  <div className="space-y-3 border rounded-lg p-4 bg-amber-50/50">
                    <Label className="text-sm font-medium">Расшифровка комплекта</Label>
                    <p className="text-xs text-muted-foreground">Например: &quot;ч/б&quot; → [чёрный, белый]. Комбо-цвет в плане раскроя разворачивается в отдельные цвета.</p>
                    {Object.entries(productForm.kitComboColors).map(([key, values]) => (
                      <div key={key} className="flex items-center gap-2 bg-white rounded-md px-3 py-2 border">
                        <span className="font-medium text-sm">{key}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-sm">[{values.join(', ')}]</span>
                        <Button size="sm" variant="ghost" className="text-red-500 ml-auto p-0 h-auto" onClick={() => removeKitCombo(key)}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <div className="flex gap-2 items-end">
                      <div className="w-24"><Label className="text-xs text-muted-foreground">Код</Label><Input value={newKitKey} onChange={(e) => setNewKitKey(e.target.value)} placeholder="ч/б" /></div>
                      <div className="flex-1"><Label className="text-xs text-muted-foreground">Цвета (через запятую)</Label><Input value={newKitValue} onChange={(e) => setNewKitValue(e.target.value)} placeholder="чёрный, белый" onKeyDown={(e) => { if (e.key === 'Enter') addKitCombo() }} /></div>
                      <Button size="sm" variant="outline" onClick={addKitCombo}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={closeProductDialog}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveProduct} disabled={createProductMutation.isPending || updateProductMutation.isPending}>
              {(createProductMutation.isPending || updateProductMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingProduct ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== EMPLOYEE DIALOG ===== */}
      <Dialog open={employeeDialogOpen} onOpenChange={(open) => { if (!open) closeEmployeeDialog(); else setEmployeeDialogOpen(true) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingEmployee ? 'Редактировать сотрудника' : 'Новый сотрудник'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>ФИО *</Label><Input value={employeeForm.name} onChange={(e) => setEmployeeForm(p => ({ ...p, name: e.target.value }))} placeholder="Иванова Мария" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Код *</Label><Input value={employeeForm.code} onChange={(e) => setEmployeeForm(p => ({ ...p, code: e.target.value }))} placeholder="Ш-001" /></div>
              <div className="space-y-2"><Label>Роль</Label>
                <Select value={employeeForm.role} onValueChange={(v) => setEmployeeForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EMPLOYEE_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{editingEmployee ? 'Логин' : 'Логин *'}</Label><Input value={employeeForm.username} onChange={(e) => setEmployeeForm(p => ({ ...p, username: e.target.value }))} placeholder="login" /></div>
              <div className="space-y-2"><Label>{editingEmployee ? 'Пароль (оставьте пустым)' : 'Пароль *'}</Label><Input type="password" value={employeeForm.password} onChange={(e) => setEmployeeForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••" /></div>
            </div>
            {employeeForm.role === 'customer' && (
              <div className="space-y-2">
                <Label>Заказчик</Label>
                <Select value={employeeForm.customerId || ''} onValueChange={(v) => setEmployeeForm(p => ({ ...p, customerId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Выберите заказчика" /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c: { id: string; name: string }) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEmployeeDialog}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveEmployee} disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}>
              {(createEmployeeMutation.isPending || updateEmployeeMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingEmployee ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== ADD BOX TYPE DIALOG ===== */}
      <Dialog open={boxDialogOpen} onOpenChange={setBoxDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Новый тип короба</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Название</Label><Input value={newBoxName} onChange={(e) => setNewBoxName(e.target.value)} placeholder="Малый, Средний..." /></div>
            <div className="space-y-2"><Label>Размеры</Label><Input value={newBoxDimensions} onChange={(e) => setNewBoxDimensions(e.target.value)} placeholder="40x30x20 см" /></div>
            <Separator />
            <div>
              <Label className="text-sm font-medium">Вместимость по изделиям</Label>
              <div className="space-y-2 mt-2">
                {newCapacities.map((cap, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select value={cap.productId} onValueChange={(v) => setNewCapacities((prev) => prev.map((c, j) => j === i ? { ...c, productId: v } : c))}>
                        <SelectTrigger><SelectValue placeholder="Изделие" /></SelectTrigger>
                        <SelectContent>{products.map((p: Product) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="w-24"><Input value={cap.size} onChange={(e) => setNewCapacities((prev) => prev.map((c, j) => j === i ? { ...c, size: e.target.value } : c))} placeholder="Размер" /></div>
                    <div className="w-20"><Input type="number" min="1" value={cap.maxQty || ''} onChange={(e) => setNewCapacities((prev) => prev.map((c, j) => j === i ? { ...c, maxQty: parseInt(e.target.value) || 0 } : c))} placeholder="Кол." /></div>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setNewCapacities((prev) => prev.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setNewCapacities((prev) => [...prev, { productId: '', size: '', maxQty: 0 }])}><Plus className="h-4 w-4 mr-1" />Добавить изделие</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBoxDialogOpen(false)}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { if (newBoxName.trim()) createBoxTypeMutation.mutate({ name: newBoxName, dimensions: newBoxDimensions || undefined, capacities: newCapacities.filter((c) => c.productId && c.size && c.maxQty > 0) || undefined }) }} disabled={createBoxTypeMutation.isPending}>{createBoxTypeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}