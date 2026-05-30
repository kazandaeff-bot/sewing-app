'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Truck,
  ChevronRight,
  PackageCheck,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { authFetch } from '@/components/auth-provider'
import type { SellerPlan, Product } from '@/types'

// ============ Types ============

interface UPDItemResponse {
  id: string
  productId: string | null
  description: string
  quantity: number
  unit: string
  price: number
  amount: number
  vatRate: number | null
  vatAmount: number | null
  product?: { id: string; name: string; article: string } | null
}

interface UPDResponse {
  id: string
  number: string
  date: string | null
  customerId: string
  invoiceId: string | null
  sellerPlanId: string | null
  status: string
  operationType: string
  note: string | null
  vatRate: number
  totalAmount: number
  vatAmount: number
  items: UPDItemResponse[]
  customer: { id: string; name: string }
  invoice: { id: string; number: string } | null
  createdAt: string
}

interface UPDItemRow {
  productId: string
  description: string
  quantity: number
  unit: string
  price: number
  amount: number
  vatRate: number | null
  vatAmount: number | null
}

// ============ Constants ============

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  confirmed: 'Подтверждён',
  sent: 'Отправлен',
  signed: 'Подписан',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  confirmed: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  sent: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  signed: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
}

const OPERATION_LABELS: Record<string, string> = {
  shipment: 'Отгрузка',
  transfer: 'Передача',
  return: 'Возврат',
}

const STATUS_ORDER = ['draft', 'confirmed', 'sent', 'signed']

// ============ Helpers ============

function formatAmount(value: number): string {
  const fixed = value.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${formatted},${decPart} \u20BD`
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function generateUPDNumber(upds: UPDResponse[]): string {
  const year = new Date().getFullYear()
  const existingThisYear = upds.filter((u) => u.number.startsWith(`УПД-${year}-`))
  const nextNum = existingThisYear.length + 1
  return `УПД-${year}-${String(nextNum).padStart(3, '0')}`
}

function emptyItemRow(): UPDItemRow {
  return {
    productId: '',
    description: '',
    quantity: 1,
    unit: 'шт',
    price: 0,
    amount: 0,
    vatRate: null,
    vatAmount: null,
  }
}

// ============ Component ============

export function UPDTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ---- Dialog state ----
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUPD, setEditingUPD] = useState<UPDResponse | null>(null)
  const [shipmentDialogOpen, setShipmentDialogOpen] = useState(false)

  // ---- Form state ----
  const [formNumber, setFormNumber] = useState('')
  const [formCustomerId, setFormCustomerId] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formInvoiceId, setFormInvoiceId] = useState('')
  const [formOperationType, setFormOperationType] = useState('shipment')
  const [formStatus, setFormStatus] = useState('draft')
  const [formVatRate, setFormVatRate] = useState(20)
  const [formNote, setFormNote] = useState('')
  const [formItems, setFormItems] = useState<UPDItemRow[]>([emptyItemRow()])

  // ---- Shipment generation state ----
  const [selectedSellerPlanId, setSelectedSellerPlanId] = useState('')

  // ============ Queries ============

  const { data: upds = [], isLoading } = useQuery<UPDResponse[]>({
    queryKey: ['upd'],
    queryFn: async () => {
      const r = await authFetch('/api/upd')
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

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const r = await authFetch('/api/products')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const r = await authFetch('/api/invoices')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: sellerPlans = [] } = useQuery<SellerPlan[]>({
    queryKey: ['seller-plans'],
    queryFn: async () => {
      const r = await authFetch('/api/seller-plans')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  // ============ Filtered seller plans for shipment generation ============

  const eligibleSellerPlans = useMemo(() => {
    return sellerPlans.filter((sp) => {
      if (sp.status !== 'distributed') return false
      // Must have at least one box with shipped status
      return sp.boxes && sp.boxes.some((box) => box.status === 'shipped')
    })
  }, [sellerPlans])

  // ============ Mutations ============

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      authFetch('/api/upd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') })
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upd'] })
      closeDialog()
      toast({ title: 'УПД создан', description: 'Документ успешно создан' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message || 'Не удалось создать УПД', variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      authFetch(`/api/upd/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') })
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upd'] })
      closeDialog()
      toast({ title: 'УПД обновлён', description: 'Документ успешно обновлён' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message || 'Не удалось обновить УПД', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      authFetch(`/api/upd/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') })
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upd'] })
      toast({ title: 'УПД удалён', description: 'Документ удалён' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message || 'Не удалось удалить УПД', variant: 'destructive' })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      authFetch(`/api/upd/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') })
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upd'] })
      toast({ title: 'Статус обновлён' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message || 'Не удалось изменить статус', variant: 'destructive' })
    },
  })

  // ============ Form totals ============

  const totalAmount = useMemo(() => {
    return formItems.reduce((sum, item) => sum + (item.amount || 0), 0)
  }, [formItems])

  const vatAmount = useMemo(() => {
    return totalAmount * formVatRate / 100
  }, [totalAmount, formVatRate])

  // ============ Dialog helpers ============

  const openCreateDialog = useCallback(() => {
    setEditingUPD(null)
    setFormNumber(generateUPDNumber(upds))
    setFormCustomerId('')
    setFormDate(new Date().toISOString().split('T')[0])
    setFormInvoiceId('')
    setFormOperationType('shipment')
    setFormStatus('draft')
    setFormVatRate(20)
    setFormNote('')
    setFormItems([emptyItemRow()])
    setDialogOpen(true)
  }, [upds])

  const openEditDialog = useCallback((upd: UPDResponse) => {
    setEditingUPD(upd)
    setFormNumber(upd.number)
    setFormCustomerId(upd.customerId)
    setFormDate(upd.date ? upd.date.split('T')[0] : '')
    setFormInvoiceId(upd.invoiceId || '')
    setFormOperationType(upd.operationType)
    setFormStatus(upd.status)
    setFormVatRate(upd.vatRate)
    setFormNote(upd.note || '')
    setFormItems(
      upd.items.length > 0
        ? upd.items.map((item) => ({
            productId: item.productId || '',
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            amount: item.amount,
            vatRate: item.vatRate,
            vatAmount: item.vatAmount,
          }))
        : [emptyItemRow()]
    )
    setDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setDialogOpen(false)
    setEditingUPD(null)
  }, [])

  // ============ Item row management ============

  const updateItem = useCallback((index: number, field: keyof UPDItemRow, value: string | number | null) => {
    setFormItems((prev) => {
      const next = [...prev]
      const item = { ...next[index], [field]: value }
      // Auto-calculate amount when quantity or price changes
      if (field === 'quantity' || field === 'price') {
        item.amount = Number(item.quantity) * Number(item.price)
      }
      next[index] = item
      return next
    })
  }, [])

  const addItemRow = useCallback(() => {
    setFormItems((prev) => [...prev, emptyItemRow()])
  }, [])

  const removeItemRow = useCallback((index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // ============ Save handler ============

  const handleSave = useCallback(() => {
    if (!formNumber.trim()) {
      toast({ title: 'Ошибка', description: 'Укажите номер УПД', variant: 'destructive' })
      return
    }
    if (!formCustomerId) {
      toast({ title: 'Ошибка', description: 'Выберите заказчика', variant: 'destructive' })
      return
    }
    const validItems = formItems.filter((item) => item.description.trim())
    if (validItems.length === 0) {
      toast({ title: 'Ошибка', description: 'Добавьте хотя бы одну позицию', variant: 'destructive' })
      return
    }

    const payload: Record<string, unknown> = {
      number: formNumber.trim(),
      customerId: formCustomerId,
      date: formDate || undefined,
      invoiceId: formInvoiceId || undefined,
      operationType: formOperationType,
      status: formStatus,
      vatRate: formVatRate,
      note: formNote || undefined,
      items: validItems.map((item) => ({
        productId: item.productId || undefined,
        description: item.description.trim(),
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
        amount: item.amount,
        vatRate: item.vatRate,
        vatAmount: item.vatAmount,
      })),
    }

    if (editingUPD) {
      updateMutation.mutate({ id: editingUPD.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }, [formNumber, formCustomerId, formDate, formInvoiceId, formOperationType, formStatus, formVatRate, formNote, formItems, editingUPD, createMutation, updateMutation, toast])

  // ============ Generate from Shipment ============

  const handleGenerateFromShipment = useCallback(() => {
    const sp = sellerPlans.find((s) => s.id === selectedSellerPlanId)
    if (!sp) return

    // Collect all items from shipped boxes
    const shippedBoxes = (sp.boxes || []).filter((b) => b.status === 'shipped')

    // Build items from shipped box items, grouping by product+size+color
    const itemsMap = new Map<string, UPDItemRow>()
    for (const box of shippedBoxes) {
      for (const boxItem of box.items) {
        const key = `${boxItem.productId}-${boxItem.size || ''}-${boxItem.color || ''}`
        const existing = itemsMap.get(key)
        if (existing) {
          existing.quantity += boxItem.actualQty ?? boxItem.plannedQty
          existing.amount = existing.quantity * existing.price
        } else {
          const qty = boxItem.actualQty ?? boxItem.plannedQty
          itemsMap.set(key, {
            productId: boxItem.productId,
            description: boxItem.product?.name || '',
            quantity: qty,
            unit: 'шт',
            price: 0,
            amount: 0,
            vatRate: formVatRate,
            vatAmount: null,
          })
        }
      }
    }

    const generatedItems = Array.from(itemsMap.values())

    // Pre-fill the create dialog
    setEditingUPD(null)
    setFormNumber(generateUPDNumber(upds))
    setFormCustomerId(sp.customerId || '')
    setFormDate(new Date().toISOString().split('T')[0])
    setFormInvoiceId('')
    setFormOperationType('shipment')
    setFormStatus('draft')
    setFormVatRate(20)
    setFormNote(`Сгенерирован из плана: ${sp.sellerName}`)
    setFormItems(generatedItems.length > 0 ? generatedItems : [emptyItemRow()])

    setShipmentDialogOpen(false)
    setSelectedSellerPlanId('')
    setDialogOpen(true)
  }, [selectedSellerPlanId, sellerPlans, upds, formVatRate])

  // ============ Status advancement ============

  const handleAdvanceStatus = useCallback((upd: UPDResponse) => {
    const currentIndex = STATUS_ORDER.indexOf(upd.status)
    if (currentIndex >= STATUS_ORDER.length - 1) return
    const nextStatus = STATUS_ORDER[currentIndex + 1]
    statusMutation.mutate({ id: upd.id, status: nextStatus })
  }, [statusMutation])

  // ============ Product name lookup ============

  const productNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of products as Product[]) {
      map.set(p.id, p.name)
    }
    return map
  }, [products])

  // ============ Loading ============

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <span className="ml-2 text-muted-foreground">Загрузка...</span>
      </div>
    )
  }

  // ============ Render ============

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-600" />
          УПД
        </h2>
        <div className="flex gap-2 flex-wrap">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={openCreateDialog}
          >
            <Plus className="h-4 w-4 mr-1" />
            Создать УПД
          </Button>
          <Button
            variant="outline"
            className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
            onClick={() => {
              setSelectedSellerPlanId('')
              setShipmentDialogOpen(true)
            }}
            disabled={eligibleSellerPlans.length === 0}
          >
            <PackageCheck className="h-4 w-4 mr-1" />
            Из отгрузки
          </Button>
        </div>
      </div>

      {/* UPD Table */}
      {upds.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-3 opacity-30" />
            <p>Нет документов УПД. Создайте первый документ.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Номер</TableHead>
                    <TableHead>Заказчик</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Счёт</TableHead>
                    <TableHead>Тип операции</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upds.map((upd) => (
                    <TableRow key={upd.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {upd.number}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate">
                        {upd.customer?.name || '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateShort(upd.date)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {upd.invoice?.number || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {OPERATION_LABELS[upd.operationType] || upd.operationType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[upd.status] || 'bg-gray-100 text-gray-700'}>
                          {STATUS_LABELS[upd.status] || upd.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap font-medium">
                        {formatAmount(upd.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Status advancement button */}
                          {STATUS_ORDER.indexOf(upd.status) < STATUS_ORDER.length - 1 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 px-2"
                              onClick={() => handleAdvanceStatus(upd)}
                              disabled={statusMutation.isPending}
                              title={STATUS_LABELS[STATUS_ORDER[STATUS_ORDER.indexOf(upd.status) + 1]]}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => openEditDialog(upd)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteMutation.mutate(upd.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ Create / Edit UPD Dialog ============ */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              {editingUPD ? 'Редактировать УПД' : 'Создать УПД'}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-5 pb-4">
              {/* Top fields grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Number */}
                <div className="space-y-1.5">
                  <Label>Номер</Label>
                  <Input
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    placeholder="УПД-2026-001"
                  />
                </div>

                {/* Customer */}
                <div className="space-y-1.5">
                  <Label>Заказчик *</Label>
                  <Select value={formCustomerId} onValueChange={setFormCustomerId}>
                    <SelectTrigger>
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

                {/* Date */}
                <div className="space-y-1.5">
                  <Label>Дата</Label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>

                {/* Invoice */}
                <div className="space-y-1.5">
                  <Label>Счёт</Label>
                  <Select value={formInvoiceId} onValueChange={(v) => setFormInvoiceId(v === '_none' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Не привязан" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">— Не привязан —</SelectItem>
                      {(invoices as Array<{ id: string; number: string; customer?: { id: string; name: string } }>).map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          {inv.number} {inv.customer ? `(${inv.customer.name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Operation Type */}
                <div className="space-y-1.5">
                  <Label>Тип операции</Label>
                  <Select value={formOperationType} onValueChange={setFormOperationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shipment">Отгрузка</SelectItem>
                      <SelectItem value="transfer">Передача</SelectItem>
                      <SelectItem value="return">Возврат</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                  <Label>Статус</Label>
                  <Select value={formStatus} onValueChange={setFormStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Черновик</SelectItem>
                      <SelectItem value="confirmed">Подтверждён</SelectItem>
                      <SelectItem value="sent">Отправлен</SelectItem>
                      <SelectItem value="signed">Подписан</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* VAT Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Ставка НДС (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formVatRate}
                    onChange={(e) => setFormVatRate(Number(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <Label>Примечание</Label>
                <textarea
                  className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Примечание к документу..."
                />
              </div>

              <Separator />

              {/* Items table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Позиции</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                    onClick={addItemRow}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Добавить
                  </Button>
                </div>

                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[140px]">Изделие</TableHead>
                        <TableHead className="min-w-[180px]">Наименование *</TableHead>
                        <TableHead className="w-[90px] text-center">Кол-во</TableHead>
                        <TableHead className="w-[70px] text-center">Ед.</TableHead>
                        <TableHead className="w-[110px] text-right">Цена</TableHead>
                        <TableHead className="w-[120px] text-right">Сумма</TableHead>
                        <TableHead className="w-[40px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formItems.map((item, index) => (
                        <TableRow key={index}>
                          {/* Product select */}
                          <TableCell className="p-1.5">
                            <Select
                              value={item.productId}
                              onValueChange={(v) => {
                                updateItem(index, 'productId', v)
                                const pName = productNameMap.get(v)
                                if (pName && !item.description) {
                                  updateItem(index, 'description', pName)
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                {(products as Product[]).map((p) => (
                                  <SelectItem key={p.id} value={p.id} className="text-xs">
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Description */}
                          <TableCell className="p-1.5">
                            <Input
                              className="h-8 text-xs"
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              placeholder="Наименование"
                            />
                          </TableCell>

                          {/* Quantity */}
                          <TableCell className="p-1.5">
                            <Input
                              type="number"
                              min="1"
                              className="h-8 text-xs text-center w-[80px]"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', Number(e.target.value) || 0)}
                            />
                          </TableCell>

                          {/* Unit */}
                          <TableCell className="p-1.5">
                            <Input
                              className="h-8 text-xs text-center w-[60px]"
                              value={item.unit}
                              onChange={(e) => updateItem(index, 'unit', e.target.value)}
                            />
                          </TableCell>

                          {/* Price */}
                          <TableCell className="p-1.5">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="h-8 text-xs text-right w-[100px]"
                              value={item.price}
                              onChange={(e) => updateItem(index, 'price', Number(e.target.value) || 0)}
                            />
                          </TableCell>

                          {/* Amount (auto-calculated) */}
                          <TableCell className="p-1.5">
                            <div className="h-8 flex items-center justify-end px-2 text-sm font-medium text-right">
                              {item.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </TableCell>

                          {/* Delete row */}
                          <TableCell className="p-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => removeItemRow(index)}
                              disabled={formItems.length <= 1}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totals */}
                <div className="flex flex-col items-end gap-1 pt-2">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">Итого:</span>
                    <span className="font-semibold min-w-[140px] text-right">
                      {formatAmount(totalAmount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">НДС ({formVatRate}%):</span>
                    <span className="font-medium min-w-[140px] text-right">
                      {formatAmount(vatAmount)}
                    </span>
                  </div>
                  <Separator className="w-[220px]" />
                  <div className="flex items-center gap-3 text-base">
                    <span className="font-semibold">Всего с НДС:</span>
                    <span className="font-bold text-emerald-600 min-w-[140px] text-right">
                      {formatAmount(totalAmount + vatAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={closeDialog}>
              Отмена
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingUPD ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ Generate from Shipment Dialog ============ */}
      <Dialog open={shipmentDialogOpen} onOpenChange={setShipmentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-600" />
              Сгенерировать УПД из отгрузки
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Выберите план распределения с отгруженными коробами</Label>
              <Select value={selectedSellerPlanId} onValueChange={setSelectedSellerPlanId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите план" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleSellerPlans.map((sp) => {
                    const shippedCount = (sp.boxes || []).filter((b) => b.status === 'shipped').length
                    return (
                      <SelectItem key={sp.id} value={sp.id}>
                        <span className="flex items-center gap-2">
                          {sp.sellerName}
                          <Badge variant="outline" className="text-xs ml-1">
                            {shippedCount} кор.
                          </Badge>
                          {sp.customer && (
                            <span className="text-muted-foreground text-xs">
                              — {sp.customer.name}
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedSellerPlanId && (() => {
              const sp = sellerPlans.find((s) => s.id === selectedSellerPlanId)
              if (!sp) return null
              const shippedBoxes = (sp.boxes || []).filter((b) => b.status === 'shipped')
              const totalItems = shippedBoxes.reduce(
                (sum, b) => sum + b.items.reduce((s, i) => s + (i.actualQty ?? i.plannedQty), 0),
                0
              )
              return (
                <Card className="bg-muted/30">
                  <CardContent className="p-4 space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">План:</span>{' '}
                      <span className="font-medium">{sp.sellerName}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Заказчик:</span>{' '}
                      <span className="font-medium">{sp.customer?.name || '—'}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Отгруженных коробов:</span>{' '}
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        {shippedBoxes.length}
                      </Badge>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Изделий:</span>{' '}
                      <span className="font-medium">{totalItems} шт</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShipmentDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleGenerateFromShipment}
              disabled={!selectedSellerPlanId}
            >
              Сгенерировать УПД
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
