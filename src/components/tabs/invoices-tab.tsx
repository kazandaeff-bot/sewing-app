'use client'

import { useState, useCallback, useMemo } from 'react'
import QRCode from 'qrcode'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { authFetch } from '@/components/auth-provider'
import {
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
  Send,
  CheckCircle,
  ArrowRight,
  QrCode,
} from 'lucide-react'

// ============ Types ============

interface InvoiceItem {
  id: string
  productId: string | null
  description: string
  quantity: number
  unit: string
  price: number
  amount: number
  vatRate: number | null
  vatAmount: number | null
}

interface Invoice {
  id: string
  number: string
  date: string
  customerId: string
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
  dueDate: string | null
  note: string | null
  vatRate: number
  totalAmount: number
  vatAmount: number
  items: InvoiceItem[]
  customer: { id: string; name: string; inn?: string }
  createdAt: string
}

interface Customer {
  id: string
  name: string
  inn?: string
  kpp?: string
  legalAddress?: string
  bankName?: string
  bik?: string
  checkingAccount?: string
  corrAccount?: string
}

interface Product {
  id: string
  name: string
  article: string
}

interface ItemRow {
  productId: string
  description: string
  quantity: number
  unit: string
  price: number
}

// ============ Helpers ============

function formatAmount(value: number): string {
  const fixed = value.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const formatted = intPart.replace(/\B(?=(\d{3})(?!\d))/g, ' ')
  return `${formatted},${decPart} ₽`
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso
  }
}

function generateInvoiceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const random = Math.floor(Math.random() * 900) + 100
  return `СЧ-${year}-${random}`
}

// ============ VAT Rate Select ============

function VatRateSelect({ value, onValueChange }: { value: string; onValueChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="20">НДС 20%</SelectItem>
        <SelectItem value="10">НДС 10%</SelectItem>
        <SelectItem value="0">НДС 0%</SelectItem>
        <SelectItem value="-1">Без НДС</SelectItem>
      </SelectContent>
    </Select>
  )
}

// ============ Items Table Component (outside render) ============

function ItemsTable({
  items,
  updateItem,
  addItem,
  removeItem,
  totals,
  vatRate,
  products,
}: {
  items: ItemRow[]
  updateItem: (index: number, field: keyof ItemRow, value: string | number) => void
  addItem: () => void
  removeItem: (index: number) => void
  totals: { totalAmount: number; vatAmount: number }
  vatRate: string
  products: Product[]
}) {
  const isNoVat = parseInt(vatRate) < 0

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Позиции счёта</Label>
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs h-9 w-[180px]">Изделие</TableHead>
              <TableHead className="text-xs h-9">Наименование</TableHead>
              <TableHead className="text-xs h-9 w-[80px]">Кол-во</TableHead>
              <TableHead className="text-xs h-9 w-[60px]">Ед.</TableHead>
              <TableHead className="text-xs h-9 w-[110px]">Цена</TableHead>
              <TableHead className="text-xs h-9 w-[120px]">Сумма</TableHead>
              <TableHead className="text-xs h-9 w-[40px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const amount = item.quantity * item.price
              return (
                <TableRow key={index}>
                  <TableCell className="p-1">
                    <Select
                      value={item.productId}
                      onValueChange={(v) => updateItem(index, 'productId', v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.name} ({p.article})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-1">
                    <Input
                      className="h-8 text-xs"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Наименование"
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <Input
                      type="number"
                      min="1"
                      className="h-8 text-xs"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <Input
                      className="h-8 text-xs"
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      className="h-8 text-xs"
                      value={item.price}
                      onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell className="p-1 text-xs text-right font-medium">
                    {formatAmount(amount)}
                  </TableCell>
                  <TableCell className="p-1">
                    {items.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        onClick={() => removeItem(index)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
        onClick={addItem}
      >
        <Plus className="h-4 w-4 mr-1" />Добавить позицию
      </Button>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-72 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Итого:</span>
            <span className="font-medium">{formatAmount(totals.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{isNoVat ? 'НДС:' : `НДС (${vatRate}%):`}</span>
            <span className="font-medium">{isNoVat ? 'Без НДС' : formatAmount(totals.vatAmount)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-base font-semibold">
            <span>Всего:</span>
            <span className="text-emerald-700">{formatAmount(totals.totalAmount + totals.vatAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: 'Черновик', className: 'bg-gray-100 text-gray-700 hover:bg-gray-100' },
    sent: { label: 'Отправлен', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
    paid: { label: 'Оплачен', className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' },
    cancelled: { label: 'Аннулирован', className: 'bg-red-100 text-red-700 hover:bg-red-100' },
  }
  const entry = map[status] || map.draft
  return <Badge variant="secondary" className={entry.className}>{entry.label}</Badge>
}

const STATUS_FLOW: Record<string, string | null> = {
  draft: 'sent',
  sent: 'paid',
  paid: null,
  cancelled: null,
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  sent: 'Отправлен',
  paid: 'Оплачен',
  cancelled: 'Аннулирован',
}

// ============ Component ============

export function InvoicesTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  // Create form state
  const [newNumber, setNewNumber] = useState('')
  const [newCustomerId, setNewCustomerId] = useState('')
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [newDueDate, setNewDueDate] = useState('')
  const [newStatus, setNewStatus] = useState<'draft' | 'sent' | 'paid' | 'cancelled'>('draft')
  const [newVatRate, setNewVatRate] = useState('20')
  const [newNote, setNewNote] = useState('')
  const [newItems, setNewItems] = useState<ItemRow[]>([
    { productId: '', description: '', quantity: 1, unit: 'шт', price: 0 },
  ])

  // Edit form state
  const [editNumber, setEditNumber] = useState('')
  const [editCustomerId, setEditCustomerId] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editStatus, setEditStatus] = useState<'draft' | 'sent' | 'paid' | 'cancelled'>('draft')
  const [editVatRate, setEditVatRate] = useState('20')
  const [editNote, setEditNote] = useState('')
  const [editItems, setEditItems] = useState<ItemRow[]>([])

  // QR code state
  const [qrOpen, setQrOpen] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [qrInvoiceNumber, setQrInvoiceNumber] = useState('')

  // ============ Queries ============

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['invoices'],
    queryFn: async () => {
      const r = await authFetch('/api/invoices')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: customers = [] } = useQuery<Customer[]>({
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

  // ============ Mutations ============

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      authFetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.error || 'Ошибка') })
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setCreateOpen(false)
      resetCreateForm()
      toast({ title: 'Счёт создан' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message || 'Не удалось создать счёт', variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      authFetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.error || 'Ошибка') })
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setEditOpen(false)
      setSelectedInvoice(null)
      toast({ title: 'Счёт обновлён' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message || 'Не удалось обновить счёт', variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      authFetch(`/api/invoices/${id}`, { method: 'DELETE' }).then((r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.error || 'Ошибка') })
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setDeleteOpen(false)
      setSelectedInvoice(null)
      toast({ title: 'Счёт удалён' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message || 'Не удалось удалить счёт', variant: 'destructive' })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      authFetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then((r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.error || 'Ошибка') })
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast({ title: 'Статус обновлён' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message || 'Не удалось обновить статус', variant: 'destructive' })
    },
  })

  // ============ Form Helpers ============

  const resetCreateForm = useCallback(() => {
    setNewNumber('')
    setNewCustomerId('')
    setNewDate(new Date().toISOString().slice(0, 10))
    setNewDueDate('')
    setNewStatus('draft')
    setNewVatRate('20')
    setNewNote('')
    setNewItems([{ productId: '', description: '', quantity: 1, unit: 'шт', price: 0 }])
  }, [])

  const calcTotals = useCallback((items: ItemRow[], vatRate: number) => {
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0)
    const vatAmount = vatRate < 0 ? 0 : totalAmount * vatRate / 100
    return { totalAmount, vatAmount }
  }, [])

  const newTotals = useMemo(() => calcTotals(newItems, parseFloat(newVatRate) || 20), [newItems, newVatRate, calcTotals])
  const editTotals = useMemo(() => calcTotals(editItems, parseFloat(editVatRate) || 20), [editItems, editVatRate, calcTotals])

  const updateNewItem = useCallback((index: number, field: keyof ItemRow, value: string | number) => {
    setNewItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      // Auto-fill description from product
      if (field === 'productId' && typeof value === 'string' && value) {
        const product = products.find((p) => p.id === value)
        if (product && !next[index].description) {
          next[index].description = `${product.name} (${product.article})`
        }
      }
      return next
    })
  }, [products])

  const updateEditItem = useCallback((index: number, field: keyof ItemRow, value: string | number) => {
    setEditItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      if (field === 'productId' && typeof value === 'string' && value) {
        const product = products.find((p) => p.id === value)
        if (product && !next[index].description) {
          next[index].description = `${product.name} (${product.article})`
        }
      }
      return next
    })
  }, [products])

  const addNewItemRow = useCallback(() => {
    setNewItems((prev) => [...prev, { productId: '', description: '', quantity: 1, unit: 'шт', price: 0 }])
  }, [])

  const removeNewItemRow = useCallback((index: number) => {
    setNewItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const addEditItemRow = useCallback(() => {
    setEditItems((prev) => [...prev, { productId: '', description: '', quantity: 1, unit: 'шт', price: 0 }])
  }, [])

  const removeEditItemRow = useCallback((index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // ============ Handlers ============

  const handleOpenCreate = useCallback(() => {
    resetCreateForm()
    setNewNumber(generateInvoiceNumber())
    setCreateOpen(true)
  }, [resetCreateForm])

  const handleCreate = useCallback(() => {
    if (!newNumber.trim()) {
      toast({ title: 'Ошибка', description: 'Укажите номер счёта', variant: 'destructive' })
      return
    }
    if (!newCustomerId) {
      toast({ title: 'Ошибка', description: 'Выберите заказчика', variant: 'destructive' })
      return
    }
    const validItems = newItems.filter((item) => item.description.trim())
    if (validItems.length === 0) {
      toast({ title: 'Ошибка', description: 'Добавьте хотя бы одну позицию', variant: 'destructive' })
      return
    }
    const vatRate = parseFloat(newVatRate) || 20
    const itemsPayload = validItems.map((item) => ({
      productId: item.productId || undefined,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      amount: item.quantity * item.price,
    }))
    createMutation.mutate({
      number: newNumber,
      date: newDate || undefined,
      customerId: newCustomerId,
      status: newStatus,
      dueDate: newDueDate || null,
      note: newNote || undefined,
      vatRate,
      items: itemsPayload,
    })
  }, [newNumber, newCustomerId, newDate, newDueDate, newStatus, newVatRate, newNote, newItems, createMutation, toast])

  const handleOpenEdit = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setEditNumber(invoice.number)
    setEditCustomerId(invoice.customerId)
    setEditDate(invoice.date ? new Date(invoice.date).toISOString().slice(0, 10) : '')
    setEditDueDate(invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : '')
    setEditStatus(invoice.status)
    setEditVatRate(String(invoice.vatRate))
    setEditNote(invoice.note || '')
    setEditItems(
      invoice.items.map((item) => ({
        productId: item.productId || '',
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        price: item.price,
      }))
    )
    setEditOpen(true)
  }, [])

  const handleUpdate = useCallback(() => {
    if (!selectedInvoice) return
    if (!editNumber.trim()) {
      toast({ title: 'Ошибка', description: 'Укажите номер счёта', variant: 'destructive' })
      return
    }
    if (!editCustomerId) {
      toast({ title: 'Ошибка', description: 'Выберите заказчика', variant: 'destructive' })
      return
    }
    const validItems = editItems.filter((item) => item.description.trim())
    if (validItems.length === 0) {
      toast({ title: 'Ошибка', description: 'Добавьте хотя бы одну позицию', variant: 'destructive' })
      return
    }
    const vatRate = parseFloat(editVatRate) || 20
    const itemsPayload = validItems.map((item) => ({
      productId: item.productId || undefined,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      amount: item.quantity * item.price,
    }))
    updateMutation.mutate({
      id: selectedInvoice.id,
      data: {
        number: editNumber,
        date: editDate || undefined,
        customerId: editCustomerId,
        status: editStatus,
        dueDate: editDueDate || null,
        note: editNote || null,
        vatRate,
        items: itemsPayload,
      },
    })
  }, [selectedInvoice, editNumber, editCustomerId, editDate, editDueDate, editStatus, editVatRate, editNote, editItems, updateMutation, toast])

  const handleStatusChange = useCallback((invoiceId: string, newStatus: string) => {
    statusMutation.mutate({ id: invoiceId, status: newStatus })
  }, [statusMutation])

  const handleShowQr = useCallback(async (invoice: Invoice) => {
    const customer = customers.find((c) => c.id === invoice.customerId)
    if (!customer?.checkingAccount || !customer?.bankName || !customer?.bik) {
      toast({ title: 'Ошибка', description: 'У заказчика не указаны банковские реквизиты', variant: 'destructive' })
      return
    }
    const sum = Math.round((invoice.totalAmount + invoice.vatAmount) * 100)
    const purpose = `Оплата по счёту №${invoice.number}`
    const content = `ST00012|Name=${customer.name}|PersonalAcc=${customer.checkingAccount}|BankName=${customer.bankName}|BIC=${customer.bik}|CorrespAcc=${customer.corrAccount || ''}|PaymPurpose=${purpose}|Sum=${sum}`
    try {
      const url = await QRCode.toDataURL(content, { width: 256, margin: 2 })
      setQrDataUrl(url)
      setQrInvoiceNumber(invoice.number)
      setQrOpen(true)
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось сгенерировать QR-код', variant: 'destructive' })
    }
  }, [customers, toast])

  // ============ Render ============

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Счета</h2>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleOpenCreate}
        >
          <Plus className="h-4 w-4 mr-1" />
          Новый счёт
        </Button>
      </div>

      {/* Invoices Table */}
      {invoices.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-3 opacity-30" />
            <p>Нет счетов</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[70vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Номер</TableHead>
                    <TableHead className="text-xs">Заказчик</TableHead>
                    <TableHead className="text-xs">Дата</TableHead>
                    <TableHead className="text-xs">Статус</TableHead>
                    <TableHead className="text-xs text-right">Сумма</TableHead>
                    <TableHead className="text-xs">Срок оплаты</TableHead>
                    <TableHead className="text-xs text-center">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const customerForInvoice = customers.find((c) => c.id === invoice.customerId)
                    return (
                      <TableRow key={invoice.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium text-sm">{invoice.number}</TableCell>
                        <TableCell className="text-sm">
                          <div>{invoice.customer?.name || '—'}</div>
                          {customerForInvoice?.inn && (
                            <div className="text-xs text-muted-foreground">ИНН: {customerForInvoice.inn}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(invoice.date)}</TableCell>
                        <TableCell>{statusBadge(invoice.status)}</TableCell>
                        <TableCell className="text-sm text-right font-medium">
                          {formatAmount(invoice.totalAmount + invoice.vatAmount)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(invoice.dueDate)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-center">
                            {/* QR code button for draft/sent */}
                            {(invoice.status === 'draft' || invoice.status === 'sent') && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                                onClick={() => handleShowQr(invoice)}
                                title="QR-код для оплаты"
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Quick status change */}
                            {STATUS_FLOW[invoice.status] && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleStatusChange(invoice.id, STATUS_FLOW[invoice.status]!)}
                                disabled={statusMutation.isPending}
                                title={`Перевести в «${STATUS_LABELS[STATUS_FLOW[invoice.status]!]}»`}
                              >
                                {invoice.status === 'draft' ? (
                                  <Send className="h-4 w-4" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              onClick={() => handleOpenEdit(invoice)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                setDeleteOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* ============ Create Invoice Dialog ============ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Новый счёт</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[72vh] pr-4">
            <div className="space-y-4">
              {/* Header fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Номер счёта</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newNumber}
                      onChange={(e) => setNewNumber(e.target.value)}
                      placeholder="СЧ-2025-001"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => setNewNumber(generateInvoiceNumber())}
                      title="Сгенерировать номер"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Заказчик</Label>
                  <Select value={newCustomerId} onValueChange={setNewCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите заказчика" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select value={newStatus} onValueChange={(v: any) => setNewStatus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Черновик</SelectItem>
                      <SelectItem value="sent">Отправлен</SelectItem>
                      <SelectItem value="paid">Оплачен</SelectItem>
                      <SelectItem value="cancelled">Аннулирован</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Дата</Label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Срок оплаты</Label>
                  <Input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ставка НДС</Label>
                  <VatRateSelect value={newVatRate} onValueChange={setNewVatRate} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Примечание</Label>
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Дополнительная информация..."
                  rows={2}
                />
              </div>

              <Separator />

              {/* Items */}
              <ItemsTable
                items={newItems}
                updateItem={updateNewItem}
                addItem={addNewItemRow}
                removeItem={removeNewItemRow}
                totals={newTotals}
                vatRate={newVatRate}
                products={products}
              />
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать счёт
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ Edit Invoice Dialog ============ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Редактировать счёт</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[72vh] pr-4">
            <div className="space-y-4">
              {/* Header fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Номер счёта</Label>
                  <Input
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Заказчик</Label>
                  <Select value={editCustomerId} onValueChange={setEditCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите заказчика" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Статус</Label>
                  <Select value={editStatus} onValueChange={(v: any) => setEditStatus(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Черновик</SelectItem>
                      <SelectItem value="sent">Отправлен</SelectItem>
                      <SelectItem value="paid">Оплачен</SelectItem>
                      <SelectItem value="cancelled">Аннулирован</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Дата</Label>
                  <Input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Срок оплаты</Label>
                  <Input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ставка НДС</Label>
                  <VatRateSelect value={editVatRate} onValueChange={setEditVatRate} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Примечание</Label>
                <Textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Дополнительная информация..."
                  rows={2}
                />
              </div>

              <Separator />

              {/* Items */}
              <ItemsTable
                items={editItems}
                updateItem={updateEditItem}
                addItem={addEditItemRow}
                removeItem={removeEditItemRow}
                totals={editTotals}
                vatRate={editVatRate}
                products={products}
              />
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Отмена
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ Delete Confirmation ============ */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить счёт?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Счёт &laquo;{selectedInvoice?.number}&raquo; будет удалён навсегда вместе со всеми позициями.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => selectedInvoice && deleteMutation.mutate(selectedInvoice.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ============ QR Code Dialog ============ */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR-код для оплаты</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-muted-foreground">Счёт №{qrInvoiceNumber}</p>
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="QR-код для оплаты СБП"
                className="w-64 h-64"
              />
            )}
            <p className="text-xs text-muted-foreground text-center">
              Отсканируйте QR-код в приложении банка для оплаты через СБП
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrOpen(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
