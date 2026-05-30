'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  FileText,
  X,
  Play,
  Ship,
  Banknote,
  Pencil,
  Undo2,
  Eye,
  Flame,
  CalendarClock,
  BarChart3,
  Scissors,
  Users,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { authFetch } from '@/components/auth-provider'
import type { Product, Plan, PlanItem, CuttingPlanItem, SewingTaskItem } from '@/types'
import { formatDate, parseKitComboColors, getKitLabel, printDocument } from '@/lib/formatters'
import { getColorDot, getPlanStatusBadge, getCuttingStatusBadge, getSewingTaskStatusBadge } from '@/lib/status-badges'
import { useItemRows } from '@/hooks/use-item-rows'
import { useProductColorSelect } from '@/hooks/use-product-color-select'

export function SewingPlansTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [planCustomerId, setPlanCustomerId] = useState('')
  const [planPriority, setPlanPriority] = useState<string>('normal')
  const [planDeadline, setPlanDeadline] = useState<string>('')

  // Use shared hooks for item row management
  const createRows = useItemRows()
  const editRows = useItemRows([])
  const supplementRows = useItemRows()

  // Use shared hooks for product/color selection
  const createColorSelect = useProductColorSelect(createRows.setRows)
  const editColorSelect = useProductColorSelect(editRows.setRows)
  const supplementColorSelect = useProductColorSelect(supplementRows.setRows)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState('')

  const [filterCustomerId, setFilterCustomerId] = useState('all')

  const [supplementDialogOpen, setSupplementDialogOpen] = useState(false)
  const [supplementPlanId, setSupplementPlanId] = useState('')
  const [supplementPlanName, setSupplementPlanName] = useState('')

  // Plan detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [detailPlanId, setDetailPlanId] = useState('')
  const [detailData, setDetailData] = useState<{
    id: string
    name: string
    status: string
    customer: { id: string; name: string } | null
    items: PlanItem[]
    cuttingPlans: Array<{
      id: string
      label: string | null
      status: string
      items: CuttingPlanItem[]
      sewingTasks: Array<{
        id: string
        status: string
        employee: { id: string; name: string }
        items: SewingTaskItem[]
      }>
    }>
    progress: {
      items: Array<{
        planItemId: string
        productId: string
        productName: string
        size: string
        color: string
        colorHex: string
        totalPlanned: number
        totalCut: number
        assignedToSewers: number
        sewnQty: number
        checkedQty: number
      }>
      total: {
        planned: number
        cut: number
        assigned: number
        sewn: number
        checked: number
        sewnPercent: number
        checkedPercent: number
      }
    }
  } | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const handleOpenDetail = useCallback(async (planId: string) => {
    setDetailPlanId(planId)
    setDetailDialogOpen(true)
    setDetailLoading(true)
    setDetailData(null)
    try {
      const res = await authFetch(`/api/plans/${planId}`)
      const data = await res.json()
      setDetailData(data)
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось загрузить данные плана', variant: 'destructive' })
    } finally {
      setDetailLoading(false)
    }
  }, [toast])

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const r = await authFetch('/api/plans')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const r = await authFetch('/api/products')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const r = await authFetch('/api/customers')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: { customerId: string; priority?: string; deadline?: string; items: Array<{ productId: string; size: string; color: string; colorHex: string; quantity: number }> }) =>
      authFetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setCreateDialogOpen(false)
      setPlanCustomerId('')
      setPlanPriority('normal')
      setPlanDeadline('')
      createRows.resetRows()
      toast({ title: 'План создан', description: 'Новый план пошива создан' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось создать план', variant: 'destructive' })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      authFetch(`/api/plans/${id}`, {
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
      authFetch(`/api/plans/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      toast({ title: 'План удалён', description: 'План пошива удалён' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось удалить план', variant: 'destructive' })
    },
  })

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, items }: { id: string; items: Array<{ productId: string; size: string; color: string; colorHex: string; quantity: number }> }) =>
      authFetch(`/api/plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      setEditDialogOpen(false)
      toast({ title: 'План обновлён', description: 'Позиции плана обновлены' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить план', variant: 'destructive' })
    },
  })

  const supplementMutation = useMutation({
    mutationFn: ({ id, addItems }: { id: string; addItems: Array<{ productId: string; size: string; color: string; colorHex: string; quantity: number }> }) =>
      authFetch(`/api/plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addItems }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] })
      queryClient.invalidateQueries({ queryKey: ['cutting-plans'] })
      setSupplementDialogOpen(false)
      setSupplementPlanId('')
      setSupplementPlanName('')
      supplementRows.resetRows()
      toast({ title: 'План дополнен', description: 'Новые позиции добавлены в план' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось дополнить план', variant: 'destructive' })
    },
  })

  const handleCreate = useCallback(() => {
    if (!planCustomerId) {
      toast({ title: 'Ошибка', description: 'Выберите заказчика', variant: 'destructive' })
      return
    }
    const validItems = createRows.rows.filter((i) => i.productId && i.size && i.color && i.quantity > 0)
    if (validItems.length === 0) {
      toast({ title: 'Ошибка', description: 'Добавьте хотя бы одну позицию', variant: 'destructive' })
      return
    }
    createMutation.mutate({ customerId: planCustomerId, priority: planPriority, deadline: planDeadline || undefined, items: validItems })
  }, [planCustomerId, planPriority, planDeadline, createRows.rows, createMutation, toast])

  const handleEdit = useCallback((plan: Plan) => {
    setEditingPlanId(plan.id)
    editRows.setRowsFromPlanItems(plan.items)
    setEditDialogOpen(true)
  }, [editRows])

  const handleEditSave = useCallback(() => {
    const validItems = editRows.rows.filter((i) => i.productId && i.size && i.color && i.quantity > 0)
    if (validItems.length === 0) {
      toast({ title: 'Ошибка', description: 'Добавьте хотя бы одну позицию', variant: 'destructive' })
      return
    }
    updatePlanMutation.mutate({ id: editingPlanId, items: validItems })
  }, [editRows.rows, editingPlanId, updatePlanMutation, toast])

  const handleSupplementSave = useCallback(() => {
    const validItems = supplementRows.rows.filter((i) => i.productId && i.size && i.color && i.quantity > 0)
    if (validItems.length === 0) {
      toast({ title: 'Ошибка', description: 'Добавьте хотя бы одну позицию', variant: 'destructive' })
      return
    }
    supplementMutation.mutate({ id: supplementPlanId, addItems: validItems })
  }, [supplementRows.rows, supplementPlanId, supplementMutation, toast])

  const handleOpenSupplement = useCallback((plan: Plan) => {
    setSupplementPlanId(plan.id)
    setSupplementPlanName(plan.name)
    supplementRows.resetRows()
    setSupplementDialogOpen(true)
  }, [supplementRows])

  const filteredPlans = filterCustomerId === 'all'
    ? plans
    : plans.filter((p: Plan) => p.customerId === filterCustomerId)

  // Sort plans: urgent first, then by deadline, then by creation date
  const sortedPlans = [...filteredPlans].sort((a: Plan, b: Plan) => {
    const priorityOrder: Record<string, number> = { urgent: 0, normal: 1, low: 2 }
    const pa = priorityOrder[a.priority || 'normal'] ?? 1
    const pb = priorityOrder[b.priority || 'normal'] ?? 1
    if (pa !== pb) return pa - pb
    if (a.deadline && b.deadline) return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    if (a.deadline) return -1
    if (b.deadline) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <span className="ml-2 text-muted-foreground">Загрузка...</span>
      </div>
    )
  }

  // Reusable item row renderer
  const renderItemRow = (
    item: { productId: string; size: string; color: string; colorHex: string; quantity: number },
    index: number,
    rowsHook: ReturnType<typeof useItemRows>,
    colorSelectHook: ReturnType<typeof useProductColorSelect>,
  ) => {
    const selectedProduct = products.find((p: Product) => p.id === item.productId)
    const availableSizes = selectedProduct?.sizes || []
    const availableColors = selectedProduct?.colors || []

    return (
      <div key={index} className="flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <Label className="text-xs text-muted-foreground">Изделие</Label>
          <Select
            value={item.productId}
            onValueChange={(v) => colorSelectHook.handleProductChange(index, v)}
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
              onValueChange={(v) => rowsHook.updateRow(index, 'size', v)}
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
              onChange={(e) => rowsHook.updateRow(index, 'size', e.target.value)}
            />
          )}
        </div>
        <div className="w-28">
          <Label className="text-xs text-muted-foreground">Цвет</Label>
          {availableColors.length > 0 || (selectedProduct?.isKit) ? (
            <Select
              value={item.color}
              onValueChange={(v) => colorSelectHook.handleColorSelect(index, v, selectedProduct)}
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
              onChange={(e) => rowsHook.updateRow(index, 'color', e.target.value)}
            />
          )}
        </div>
        <div className="w-16">
          <Label className="text-xs text-muted-foreground">Hex</Label>
          <div className="flex items-center gap-1">
            <input
              type="color"
              value={item.colorHex}
              onChange={(e) => rowsHook.updateRow(index, 'colorHex', e.target.value)}
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
            onChange={(e) => rowsHook.updateRow(index, 'quantity', parseInt(e.target.value) || 0)}
          />
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-red-500 hover:text-red-700 hover:bg-red-50 mb-0.5"
          onClick={() => rowsHook.removeRow(index)}
          disabled={rowsHook.rows.length <= 1}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold">Планы пошива</h2>
        <div className="flex items-center gap-2">
          <Select value={filterCustomerId} onValueChange={setFilterCustomerId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Все заказчики" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все заказчики</SelectItem>
              {customers.map((c: { id: string; name: string }) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Создать план
          </Button>
        </div>
      </div>

      {filteredPlans.length === 0 ? (
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
                <TableHead>Заказчик</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Позиций</TableHead>
                <TableHead>Раскрой</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlans.map((plan: Plan) => (
                <TableRow key={plan.id} className="cursor-pointer hover:bg-emerald-50/50" onClick={() => handleOpenDetail(plan.id)}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-emerald-600 shrink-0" />
                      {plan.name}
                      {plan.priority === 'urgent' && (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[10px] px-1.5 py-0"><Flame className="h-3 w-3 mr-0.5" />СРОЧНЫЙ</Badge>
                      )}
                      {plan.priority === 'low' && (
                        <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 text-[10px] px-1.5 py-0">НИЗКИЙ</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {plan.customer?.name || <Badge variant="outline" className="text-amber-600 border-amber-300">Не указан</Badge>}
                  </TableCell>
                  <TableCell>{getPlanStatusBadge(plan.status)}</TableCell>
                  <TableCell>{plan.items.length}</TableCell>
                  <TableCell>
                    {plan.cuttingPlans && plan.cuttingPlans.length > 0 ? (
                      plan.cuttingPlans.length > 1 ? (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                          {plan.cuttingPlans.length} раскроя
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className={plan.cuttingPlans[0].status === 'cut' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}>
                          Раскрой: {plan.cuttingPlans[0].status === 'cut' ? 'раскроено' : 'в работе'}
                        </Badge>
                      )
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{formatDate(plan.createdAt)}
                    {plan.deadline && (
                      <div className={`text-[10px] mt-0.5 ${new Date(plan.deadline) < new Date() && plan.status !== 'shipped' && plan.status !== 'shipped_paid' ? 'text-red-600 font-semibold' : 'text-amber-600'}`}>
                        <CalendarClock className="h-3 w-3 inline mr-0.5" />
                        Дедлайн: {formatDate(plan.deadline)}
                        {new Date(plan.deadline) < new Date() && plan.status !== 'shipped' && plan.status !== 'shipped_paid' && ' (просрочен)'}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {plan.status === 'draft' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(plan)}
                            disabled={updatePlanMutation.isPending}
                          >
                            <Pencil className="h-4 w-4" />
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
                            className="bg-amber-500 hover:bg-amber-600 text-white"
                            onClick={() => statusMutation.mutate({ id: plan.id, status: 'in_work' })}
                            disabled={statusMutation.isPending}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            В работу
                          </Button>
                          {!plan.cuttingPlans?.some((cp) => cp.status === 'cut') && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-400 text-amber-600 hover:bg-amber-50"
                              onClick={() => statusMutation.mutate({ id: plan.id, status: 'draft' })}
                              disabled={statusMutation.isPending}
                            >
                              <Undo2 className="h-4 w-4 mr-1" />
                              Вернуть в черновик
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-400 text-emerald-600 hover:bg-emerald-50"
                            onClick={() => handleOpenSupplement(plan)}
                            disabled={supplementMutation.isPending}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Дополнить
                          </Button>
                        </>
                      )}
                      {plan.status === 'in_work' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-sky-500 hover:bg-sky-600 text-white"
                            onClick={() => statusMutation.mutate({ id: plan.id, status: 'shipped' })}
                            disabled={statusMutation.isPending}
                          >
                            <Ship className="h-4 w-4 mr-1" />
                            Отгружен
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-emerald-400 text-emerald-600 hover:bg-emerald-50"
                            onClick={() => handleOpenSupplement(plan)}
                            disabled={supplementMutation.isPending}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Дополнить
                          </Button>
                        </>
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

      {/* Create Plan Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Создать план пошива</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Заказчик <span className="text-red-500">*</span></Label>
                <Select value={planCustomerId} onValueChange={setPlanCustomerId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите заказчика" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c: { id: string; name: string }) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Приоритет</Label>
                  <Select value={planPriority} onValueChange={setPlanPriority}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent"><span className="flex items-center gap-1"><Flame className="h-3 w-3 text-red-500" />Срочный</span></SelectItem>
                      <SelectItem value="normal">Обычный</SelectItem>
                      <SelectItem value="low">Низкий</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Дедлайн</Label>
                  <Input type="date" value={planDeadline} onChange={(e) => setPlanDeadline(e.target.value)} />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Позиции</Label>
                  <Button size="sm" variant="outline" onClick={createRows.addRow}>
                    <Plus className="h-4 w-4 mr-1" />
                    Добавить
                  </Button>
                </div>

                <div className="space-y-2">
                  {createRows.rows.map((item, index) => renderItemRow(item, index, createRows, createColorSelect))}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCreateDialogOpen(false)
              setPlanCustomerId('')
              setPlanPriority('normal')
              setPlanDeadline('')
            }}>
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

      {/* Edit Plan Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Редактирование: {(plans as Plan[]).find((p) => p.id === editingPlanId)?.name || 'План'}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Позиции</Label>
                  <Button size="sm" variant="outline" onClick={editRows.addRow}>
                    <Plus className="h-4 w-4 mr-1" />
                    Добавить
                  </Button>
                </div>

                <div className="space-y-2">
                  {editRows.rows.map((item, index) => renderItemRow(item, index, editRows, editColorSelect))}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleEditSave}
              disabled={updatePlanMutation.isPending}
            >
              {updatePlanMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplement Plan Dialog */}
      <Dialog open={supplementDialogOpen} onOpenChange={setSupplementDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Дополнить план: {supplementPlanName}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Новые позиции</Label>
                  <Button size="sm" variant="outline" onClick={supplementRows.addRow}>
                    <Plus className="h-4 w-4 mr-1" />
                    Добавить
                  </Button>
                </div>

                <div className="space-y-2">
                  {supplementRows.rows.map((item, index) => renderItemRow(item, index, supplementRows, supplementColorSelect))}
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplementDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSupplementSave}
              disabled={supplementMutation.isPending}
            >
              {supplementMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Добавить позиции
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              {detailData?.name || 'План пошива'}
            </DialogTitle>
            {detailData && (
              <DialogDescription className="flex items-center gap-3 mt-1">
                {detailData.customer?.name && <span>Заказчик: {detailData.customer.name}</span>}
                {getPlanStatusBadge(detailData.status)}
              </DialogDescription>
            )}
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              <span className="ml-2 text-muted-foreground">Загрузка...</span>
            </div>
          ) : detailData && detailData.progress ? (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                {/* Overall progress */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-xs text-blue-600 mb-1">Планируется</div>
                    <div className="text-xl font-bold text-blue-700">{detailData.progress.total.planned}</div>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="text-xs text-amber-600 mb-1">Раскроено</div>
                    <div className="text-xl font-bold text-amber-700">{detailData.progress.total.cut}</div>
                  </div>
                  <div className="text-center p-3 bg-sky-50 rounded-lg border border-sky-200">
                    <div className="text-xs text-sky-600 mb-1">Назначено</div>
                    <div className="text-xl font-bold text-sky-700">{detailData.progress.total.assigned}</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="text-xs text-orange-600 mb-1">Отшито</div>
                    <div className="text-xl font-bold text-orange-700">{detailData.progress.total.sewn}</div>
                  </div>
                  <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200 col-span-2 sm:col-span-1">
                    <div className="text-xs text-emerald-600 mb-1">Проверено ОТК</div>
                    <div className="text-xl font-bold text-emerald-700">{detailData.progress.total.checked}</div>
                  </div>
                </div>

                {/* Progress bars */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Прогресс пошива</span>
                      <span className="font-semibold text-orange-700">{detailData.progress.total.sewnPercent}%</span>
                    </div>
                    <Progress value={detailData.progress.total.sewnPercent} className="h-3" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Проверено ОТК</span>
                      <span className="font-semibold text-emerald-700">{detailData.progress.total.checkedPercent}%</span>
                    </div>
                    <Progress value={detailData.progress.total.checkedPercent} className="h-3" />
                  </div>
                </div>

                <Separator />

                {/* Per-position progress */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Прогресс по позициям</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Изделие</TableHead>
                          <TableHead>Размер</TableHead>
                          <TableHead>Цвет</TableHead>
                          <TableHead className="text-center">План</TableHead>
                          <TableHead className="text-center">Раскрой</TableHead>
                          <TableHead className="text-center">Назначено</TableHead>
                          <TableHead className="text-center">Отшито</TableHead>
                          <TableHead className="text-center">ОТК</TableHead>
                          <TableHead className="text-center">Прогресс</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailData.progress.items.map((item) => {
                          const percent = item.totalPlanned > 0 ? Math.round((item.checkedQty / item.totalPlanned) * 100) : 0
                          const sewnPercent = item.totalPlanned > 0 ? Math.round((item.sewnQty / item.totalPlanned) * 100) : 0
                          return (
                            <TableRow key={item.planItemId}>
                              <TableCell className="font-medium">{item.productName}</TableCell>
                              <TableCell>{item.size}</TableCell>
                              <TableCell>
                                <span className="flex items-center">
                                  {getColorDot(item.colorHex)}
                                  {item.color}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">{item.totalPlanned}</TableCell>
                              <TableCell className="text-center">{item.totalCut}</TableCell>
                              <TableCell className="text-center">{item.assignedToSewers}</TableCell>
                              <TableCell className="text-center">{item.sewnQty}</TableCell>
                              <TableCell className="text-center font-semibold text-emerald-700">{item.checkedQty}</TableCell>
                              <TableCell className="text-center w-32">
                                <div className="flex items-center gap-2">
                                  <Progress value={sewnPercent} className="h-2 flex-1" />
                                  <span className="text-xs text-muted-foreground w-8">{percent}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Sewing tasks info */}
                {detailData.cuttingPlans.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-semibold mb-3">Задания швеям</h4>
                      <div className="space-y-2">
                        {detailData.cuttingPlans.map((cp) => (
                          <div key={cp.id}>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                              <Scissors className="h-3 w-3" />
                              <span className="font-medium">Раскрой: {cp.label || 'Основной'}</span>
                              {getCuttingStatusBadge(cp.status)}
                            </div>
                            {cp.sewingTasks.length === 0 ? (
                              <p className="text-xs text-muted-foreground pl-5">Нет заданий</p>
                            ) : (
                              <div className="space-y-1 pl-5">
                                {cp.sewingTasks.map((st) => (
                                  <div key={st.id} className="flex items-center gap-2 text-sm bg-muted/40 rounded px-3 py-1.5">
                                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-medium">{st.employee.name}</span>
                                    {getSewingTaskStatusBadge(st.status)}
                                    <span className="text-muted-foreground">—</span>
                                    <span>{st.items.length} поз., {st.items.reduce((s, i) => s + i.quantity, 0)} шт</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Нет данных</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
