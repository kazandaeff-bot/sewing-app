'use client'

import { useState, useCallback, useMemo } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { authFetch } from '@/components/auth-provider'
import {
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Building2,
  Banknote,
  Truck,
  StickyNote,
  CheckCircle2,
  Play,
  Flag,
} from 'lucide-react'

// ============ Types ============

interface Customer {
  id: string
  name: string
  type: string
  inn: string | null
  kpp: string | null
  legalAddress: string | null
  postalAddress: string | null
  phone: string | null
  email: string | null
  bankName: string | null
  bik: string | null
  checkingAccount: string | null
  corrAccount: string | null
  bankCity: string | null
}

interface Contract {
  id: string
  number: string
  date: string
  customerId: string
  type: 'service' | 'supply'
  status: 'draft' | 'active' | 'completed' | 'terminated'
  subject: string | null
  amount: number | null
  vatRate: number
  vatAmount: number | null
  startDate: string | null
  endDate: string | null
  paymentTerms: string | null
  deliveryTerms: string | null
  note: string | null
  planId: string | null
  invoiceId: string | null
  customer: Customer
  createdAt: string
  updatedAt: string
}

// ============ Status & Type Config ============

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  draft: { label: 'Черновик', color: 'text-gray-700', bgColor: 'bg-gray-100', borderColor: 'border-gray-300' },
  active: { label: 'Действующий', color: 'text-emerald-700', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-300' },
  completed: { label: 'Завершён', color: 'text-blue-700', bgColor: 'bg-blue-100', borderColor: 'border-blue-300' },
  terminated: { label: 'Расторгнут', color: 'text-red-700', bgColor: 'bg-red-100', borderColor: 'border-red-300' },
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  service: { label: 'Услуги', color: 'text-violet-700', bgColor: 'bg-violet-100' },
  supply: { label: 'Поставка', color: 'text-amber-700', bgColor: 'bg-amber-100' },
}

const STATUS_FLOW: Record<string, string | null> = {
  draft: 'active',
  active: 'completed',
  completed: null,
  terminated: null,
}

const VAT_OPTIONS = [
  { value: '20', label: '20%' },
  { value: '10', label: '10%' },
  { value: '0', label: '0%' },
  { value: '-1', label: 'Без НДС' },
]

// ============ Helpers ============

function formatAmount(value: number | null | undefined): string {
  if (value == null) return '—'
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

function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

function generateContractNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const random = Math.floor(Math.random() * 900) + 100
  return `Д-${year}-${random}`
}

function statusBadge(status: string) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft
  return (
    <Badge variant="secondary" className={`${cfg.bgColor} ${cfg.color} hover:${cfg.bgColor}`}>
      {cfg.label}
    </Badge>
  )
}

function typeBadge(type: string) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.service
  return (
    <Badge variant="secondary" className={`${cfg.bgColor} ${cfg.color} hover:${cfg.bgColor}`}>
      {cfg.label}
    </Badge>
  )
}

// ============ Generate Document HTML ============

function generateContractDocument(contract: Contract): string {
  const c = contract.customer
  const typeLabel = contract.type === 'service' ? 'на оказание услуг' : 'на поставку'
  const typeLabelFull = contract.type === 'service' ? 'Оказание услуг по пошиву изделий' : 'Поставка изделий'

  const vatText = contract.vatRate > 0
    ? `В том числе НДС (${contract.vatRate}%): ${formatAmount(contract.vatAmount)}`
    : 'Без НДС'

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Договор ${contract.number}</title>
  <style>
    @page { margin: 2cm; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 14px;
      line-height: 1.6;
      color: #000;
      max-width: 210mm;
      margin: 0 auto;
      padding: 2cm;
    }
    h1 {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    h2 {
      text-align: center;
      font-size: 14px;
      font-weight: normal;
      margin-bottom: 20px;
    }
    .date-place {
      text-align: center;
      margin-bottom: 24px;
      font-style: italic;
    }
    .parties {
      margin-bottom: 24px;
    }
    .party {
      margin-bottom: 16px;
    }
    .party-title {
      font-weight: bold;
      margin-bottom: 4px;
    }
    .party-details {
      font-size: 13px;
      margin-left: 20px;
    }
    .section {
      margin-bottom: 16px;
    }
    .section-title {
      font-weight: bold;
      margin-bottom: 4px;
    }
    .section-text {
      text-align: justify;
    }
    .signatures {
      margin-top: 48px;
      display: flex;
      justify-content: space-between;
    }
    .signature-block {
      width: 45%;
    }
    .signature-line {
      border-top: 1px solid #000;
      margin-top: 48px;
      padding-top: 4px;
      font-size: 12px;
    }
    .signature-name {
      margin-top: 8px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>ДОГОВОР № ${contract.number}</h1>
  <h2>${typeLabel}</h2>
  <div class="date-place">
    г. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    &laquo;${new Date(contract.date).getDate()}&raquo;
    ${new Date(contract.date).toLocaleDateString('ru-RU', { month: 'long' })}
    ${new Date(contract.date).getFullYear()} г.
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-title">Исполнитель:</div>
      <div class="party-details">
        [Наименование нашей компании]<br>
        ИНН: [ИНН] &nbsp; КПП: [КПП]<br>
        Юр. адрес: [Юридический адрес]<br>
        Банк: [Наименование банка]<br>
        БИК: [БИК]<br>
        Р/с: [Расчётный счёт]<br>
        К/с: [Корреспондентский счёт]
      </div>
    </div>
    <div class="party">
      <div class="party-title">Заказчик:</div>
      <div class="party-details">
        ${c.name}<br>
        ${c.inn ? `ИНН: ${c.inn}` : ''} ${c.kpp ? `КПП: ${c.kpp}` : ''}<br>
        ${c.legalAddress ? `Юр. адрес: ${c.legalAddress}` : ''}<br>
        ${c.bankName ? `Банк: ${c.bankName}` : ''}<br>
        ${c.bik ? `БИК: ${c.bik}` : ''}<br>
        ${c.checkingAccount ? `Р/с: ${c.checkingAccount}` : ''}<br>
        ${c.corrAccount ? `К/с: ${c.corrAccount}` : ''}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">1. ПРЕДМЕТ ДОГОВОРА</div>
    <div class="section-text">
      1.1. Исполнитель обязуется ${contract.type === 'service' ? 'оказать Заказчику услуги по пошиву изделий' : 'поставить Заказчику изделия'}, а Заказчик обязуется принять и оплатить ${contract.type === 'service' ? 'услуги' : 'товар'}.
      ${contract.subject ? `<br>1.2. Предмет договора: ${contract.subject}` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">2. СТОИМОСТЬ ДОГОВОРА И ПОРЯДОК РАСЧЁТОВ</div>
    <div class="section-text">
      2.1. Стоимость ${contract.type === 'service' ? 'услуг' : 'товара'} по настоящему договору составляет <b>${formatAmount(contract.amount)}</b>.
      <br>2.2. ${vatText}.
      ${contract.paymentTerms ? `<br>2.3. Порядок оплаты: ${contract.paymentTerms}` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">3. СРОКИ ${contract.type === 'service' ? 'ВЫПОЛНЕНИЯ УСЛУГ' : 'ПОСТАВКИ'}</div>
    <div class="section-text">
      ${contract.startDate ? `3.1. Договор вступает в силу: ${formatDateLong(contract.startDate)}.` : ''}
      ${contract.endDate ? `<br>3.2. Срок окончания: ${formatDateLong(contract.endDate)}.` : ''}
      ${contract.deliveryTerms ? `<br>3.3. Условия ${contract.type === 'service' ? 'выполнения' : 'поставки'}: ${contract.deliveryTerms}` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">4. ОТВЕТСТВЕННОСТЬ СТОРОН</div>
    <div class="section-text">
      4.1. За неисполнение или ненадлежащее исполнение обязательств по настоящему договору стороны несут ответственность в соответствии с действующим законодательством РФ.
    </div>
  </div>

  <div class="section">
    <div class="section-title">5. РАЗРЕШЕНИЕ СПОРОВ</div>
    <div class="section-text">
      5.1. Все споры и разногласия, возникающие из настоящего договора, разрешаются путём переговоров. При невозможности разрешения споров путём переговоров, они передаются на рассмотрение в арбитражный суд.
    </div>
  </div>

  <div class="section">
    <div class="section-title">6. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ</div>
    <div class="section-text">
      6.1. Настоящий договор вступает в силу с момента подписания обеими сторонами.
      <br>6.2. Договор составлен в двух экземплярах, имеющих равную юридическую силу, по одному для каждой из сторон.
    </div>
  </div>

  ${contract.note ? `<div class="section"><div class="section-text"><i>Примечание: ${contract.note}</i></div></div>` : ''}

  <div class="signatures">
    <div class="signature-block">
      <b>Исполнитель</b>
      <div class="signature-line">Подпись</div>
      <div class="signature-name">М.П.</div>
    </div>
    <div class="signature-block">
      <b>Заказчик</b>
      <div class="signature-line">Подпись</div>
      <div class="signature-name">М.П.</div>
    </div>
  </div>
</body>
</html>`
}

// ============ Customer Requisites Preview Component ============

function CustomerRequisitesPreview({ customer }: { customer: Customer | null }) {
  if (!customer) return null
  return (
    <Card className="bg-muted/30">
      <CardContent className="p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Реквизиты заказчика</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {customer.inn && (
            <div><span className="text-muted-foreground">ИНН:</span> {customer.inn}</div>
          )}
          {customer.kpp && (
            <div><span className="text-muted-foreground">КПП:</span> {customer.kpp}</div>
          )}
          {customer.legalAddress && (
            <div className="col-span-2"><span className="text-muted-foreground">Юр. адрес:</span> {customer.legalAddress}</div>
          )}
          {customer.bankName && (
            <div className="col-span-2"><span className="text-muted-foreground">Банк:</span> {customer.bankName}</div>
          )}
          {customer.bik && (
            <div><span className="text-muted-foreground">БИК:</span> {customer.bik}</div>
          )}
          {customer.checkingAccount && (
            <div><span className="text-muted-foreground">Р/с:</span> {customer.checkingAccount}</div>
          )}
          {customer.corrAccount && (
            <div><span className="text-muted-foreground">К/с:</span> {customer.corrAccount}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ============ Contract Form Fields Sub-Component ============

function ContractFormFields({
  number, setNumber,
  customerId, setCustomerId,
  type, setType,
  status, setStatus,
  date, setDate,
  startDate, setStartDate,
  endDate, setEndDate,
  subject, setSubject,
  amount, setAmount,
  vatRate, setVatRate,
  paymentTerms, setPaymentTerms,
  deliveryTerms, setDeliveryTerms,
  note, setNote,
  customers,
  selectedCustomer,
}: {
  number: string; setNumber: (v: string) => void
  customerId: string; setCustomerId: (v: string) => void
  type: string; setType: (v: string) => void
  status: string; setStatus: (v: string) => void
  date: string; setDate: (v: string) => void
  startDate: string; setStartDate: (v: string) => void
  endDate: string; setEndDate: (v: string) => void
  subject: string; setSubject: (v: string) => void
  amount: string; setAmount: (v: string) => void
  vatRate: string; setVatRate: (v: string) => void
  paymentTerms: string; setPaymentTerms: (v: string) => void
  deliveryTerms: string; setDeliveryTerms: (v: string) => void
  note: string; setNote: (v: string) => void
  customers: Customer[]
  selectedCustomer: Customer | null
}) {
  return (
    <div className="space-y-4">
      {/* Row 1: Number, Type, Customer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Номер договора</Label>
          <div className="flex gap-2">
            <Input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Д-2025-001"
            />
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => setNumber(generateContractNumber())}
              title="Сгенерировать номер"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Тип договора</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="service">Договор на услуги (пошив)</SelectItem>
              <SelectItem value="supply">Договор на поставку</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Заказчик</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите заказчика" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}{c.inn ? ` (ИНН ${c.inn})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Customer requisites preview */}
      <CustomerRequisitesPreview customer={selectedCustomer} />

      {/* Row 2: Date, Start date, End date */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Дата договора</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Дата начала</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Дата окончания</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {/* Subject */}
      <div className="space-y-2">
        <Label>Предмет договора</Label>
        <Textarea
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Оказание услуг по пошиву изделий"
          rows={2}
        />
      </div>

      {/* Row 3: Amount, VAT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Сумма договора</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label>Ставка НДС</Label>
          <Select value={vatRate} onValueChange={setVatRate}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VAT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payment Terms */}
      <div className="space-y-2">
        <Label>Условия оплаты</Label>
        <Textarea
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value)}
          placeholder="Оплата в течение 5 банковских дней после подписания акта"
          rows={2}
        />
      </div>

      {/* Delivery Terms */}
      <div className="space-y-2">
        <Label>Условия поставки</Label>
        <Textarea
          value={deliveryTerms}
          onChange={(e) => setDeliveryTerms(e.target.value)}
          placeholder="Самовывоз со склада Исполнителя"
          rows={2}
        />
      </div>

      {/* Note */}
      <div className="space-y-2">
        <Label>Примечание</Label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Дополнительная информация..."
          rows={2}
        />
      </div>

      {/* Status (for edit form) */}
      {status !== undefined && setStatus !== undefined && (
        <div className="space-y-2">
          <Label>Статус</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Черновик</SelectItem>
              <SelectItem value="active">Действующий</SelectItem>
              <SelectItem value="completed">Завершён</SelectItem>
              <SelectItem value="terminated">Расторгнут</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}

// ============ Main Component ============

export function ContractsTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // --- View State ---
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null)

  // --- Dialog State ---
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // --- Create Form State ---
  const [newNumber, setNewNumber] = useState('')
  const [newCustomerId, setNewCustomerId] = useState('')
  const [newType, setNewType] = useState('service')
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [newSubject, setNewSubject] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newVatRate, setNewVatRate] = useState('20')
  const [newPaymentTerms, setNewPaymentTerms] = useState('')
  const [newDeliveryTerms, setNewDeliveryTerms] = useState('')
  const [newNote, setNewNote] = useState('')

  // --- Edit Form State ---
  const [editNumber, setEditNumber] = useState('')
  const [editCustomerId, setEditCustomerId] = useState('')
  const [editType, setEditType] = useState('service')
  const [editStatus, setEditStatus] = useState('draft')
  const [editDate, setEditDate] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editSubject, setEditSubject] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editVatRate, setEditVatRate] = useState('20')
  const [editPaymentTerms, setEditPaymentTerms] = useState('')
  const [editDeliveryTerms, setEditDeliveryTerms] = useState('')
  const [editNote, setEditNote] = useState('')

  // ============ Queries ============

  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: async () => {
      const r = await authFetch('/api/contracts')
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

  // ============ Computed ============

  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === selectedContractId) ?? null,
    [contracts, selectedContractId],
  )

  const newSelectedCustomer = useMemo(
    () => customers.find((c) => c.id === newCustomerId) ?? null,
    [customers, newCustomerId],
  )

  const editSelectedCustomer = useMemo(
    () => customers.find((c) => c.id === editCustomerId) ?? null,
    [customers, editCustomerId],
  )

  // ============ Mutations ============

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      authFetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async (r) => {
        const res = await r.json()
        if (!r.ok) throw new Error(res.error || 'Ошибка')
        return res
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      setCreateOpen(false)
      resetCreateForm()
      toast({ title: 'Договор создан' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      authFetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async (r) => {
        const res = await r.json()
        if (!r.ok) throw new Error(res.error || 'Ошибка')
        return res
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      setEditOpen(false)
      toast({ title: 'Договор обновлён' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      authFetch(`/api/contracts/${id}`, { method: 'DELETE' }).then(async (r) => {
        const res = await r.json()
        if (!r.ok) throw new Error(res.error || 'Ошибка')
        return res
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      setDeleteOpen(false)
      setSelectedContractId(null)
      toast({ title: 'Договор удалён' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      authFetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then(async (r) => {
        const res = await r.json()
        if (!r.ok) throw new Error(res.error || 'Ошибка')
        return res
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      toast({ title: 'Статус обновлён' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  // ============ Form Helpers ============

  const resetCreateForm = useCallback(() => {
    setNewNumber('')
    setNewCustomerId('')
    setNewType('service')
    setNewDate(new Date().toISOString().slice(0, 10))
    setNewStartDate('')
    setNewEndDate('')
    setNewSubject('')
    setNewAmount('')
    setNewVatRate('20')
    setNewPaymentTerms('')
    setNewDeliveryTerms('')
    setNewNote('')
  }, [])

  const handleOpenCreate = useCallback(() => {
    resetCreateForm()
    setNewNumber(generateContractNumber())
    setCreateOpen(true)
  }, [resetCreateForm])

  const handleCreate = useCallback(() => {
    if (!newNumber.trim()) {
      toast({ title: 'Ошибка', description: 'Укажите номер договора', variant: 'destructive' })
      return
    }
    if (!newCustomerId) {
      toast({ title: 'Ошибка', description: 'Выберите заказчика', variant: 'destructive' })
      return
    }
    const vatRate = newVatRate === '-1' ? 0 : parseFloat(newVatRate) || 20
    createMutation.mutate({
      number: newNumber,
      date: newDate || undefined,
      customerId: newCustomerId,
      type: newType,
      status: 'draft',
      subject: newSubject.trim() || undefined,
      amount: newAmount ? parseFloat(newAmount) : null,
      vatRate,
      startDate: newStartDate || null,
      endDate: newEndDate || null,
      paymentTerms: newPaymentTerms.trim() || undefined,
      deliveryTerms: newDeliveryTerms.trim() || undefined,
      note: newNote.trim() || undefined,
    })
  }, [newNumber, newCustomerId, newType, newDate, newStartDate, newEndDate, newSubject, newAmount, newVatRate, newPaymentTerms, newDeliveryTerms, newNote, createMutation, toast])

  const handleOpenEdit = useCallback((contract: Contract) => {
    setEditNumber(contract.number)
    setEditCustomerId(contract.customerId)
    setEditType(contract.type)
    setEditStatus(contract.status)
    setEditDate(contract.date ? new Date(contract.date).toISOString().slice(0, 10) : '')
    setEditStartDate(contract.startDate ? new Date(contract.startDate).toISOString().slice(0, 10) : '')
    setEditEndDate(contract.endDate ? new Date(contract.endDate).toISOString().slice(0, 10) : '')
    setEditSubject(contract.subject || '')
    setEditAmount(contract.amount != null ? String(contract.amount) : '')
    setEditVatRate(String(contract.vatRate))
    setEditPaymentTerms(contract.paymentTerms || '')
    setEditDeliveryTerms(contract.deliveryTerms || '')
    setEditNote(contract.note || '')
    setEditOpen(true)
  }, [])

  const handleUpdate = useCallback(() => {
    if (!selectedContract) return
    if (!editNumber.trim()) {
      toast({ title: 'Ошибка', description: 'Укажите номер договора', variant: 'destructive' })
      return
    }
    const vatRate = editVatRate === '-1' ? 0 : parseFloat(editVatRate) || 20
    updateMutation.mutate({
      id: selectedContract.id,
      data: {
        number: editNumber,
        date: editDate || undefined,
        customerId: editCustomerId,
        type: editType,
        status: editStatus,
        subject: editSubject.trim() || null,
        amount: editAmount ? parseFloat(editAmount) : null,
        vatRate,
        startDate: editStartDate || null,
        endDate: editEndDate || null,
        paymentTerms: editPaymentTerms.trim() || null,
        deliveryTerms: editDeliveryTerms.trim() || null,
        note: editNote.trim() || null,
      },
    })
  }, [selectedContract, editNumber, editCustomerId, editType, editStatus, editDate, editStartDate, editEndDate, editSubject, editAmount, editVatRate, editPaymentTerms, editDeliveryTerms, editNote, updateMutation, toast])

  const handleStatusChange = useCallback((contractId: string, newStatus: string) => {
    statusMutation.mutate({ id: contractId, status: newStatus })
  }, [statusMutation])

  const handleGenerateDocument = useCallback((contract: Contract) => {
    const html = generateContractDocument(contract)
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(html)
      newWindow.document.close()
    } else {
      toast({ title: 'Ошибка', description: 'Не удалось открыть окно. Разрешите всплывающие окна.', variant: 'destructive' })
    }
  }, [toast])

  // ============ Loading State ============

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <span className="ml-2 text-muted-foreground">Загрузка...</span>
      </div>
    )
  }

  // ============ Contract Detail View ============

  if (selectedContract) {
    const nextStatus = STATUS_FLOW[selectedContract.status]
    const nextLabel = nextStatus ? STATUS_CONFIG[nextStatus]?.label : null

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="self-start text-emerald-600 hover:text-emerald-700"
            onClick={() => setSelectedContractId(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            К списку договоров
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-bold">Договор № {selectedContract.number}</h2>
            <p className="text-sm text-muted-foreground">
              {selectedContract.customer.name}
              {selectedContract.customer.inn ? ` · ИНН ${selectedContract.customer.inn}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Quick status change */}
            {nextStatus && nextLabel && (
              <Button
                variant="outline"
                size="sm"
                className="min-h-[44px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                onClick={() => handleStatusChange(selectedContract.id, nextStatus)}
                disabled={statusMutation.isPending}
                title={`Перевести в «${nextLabel}»`}
              >
                {selectedContract.status === 'draft' ? (
                  <Play className="h-4 w-4 mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                {nextLabel}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() => handleOpenEdit(selectedContract)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </Button>
          </div>
        </div>

        {/* Main Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-3">
              <FileText className="h-5 w-5 text-emerald-600" />
              Информация о договоре
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Тип</p>
                {typeBadge(selectedContract.type)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Статус</p>
                {statusBadge(selectedContract.status)}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Дата договора</p>
                <p className="font-medium flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {formatDate(selectedContract.date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Сумма договора</p>
                <p className="font-semibold text-emerald-600 flex items-center gap-1.5">
                  <Banknote className="h-4 w-4" />
                  {formatAmount(selectedContract.amount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">НДС ({selectedContract.vatRate}%)</p>
                <p className="font-medium">{formatAmount(selectedContract.vatAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Срок действия</p>
                <p className="font-medium">
                  {formatDate(selectedContract.startDate)} — {formatDate(selectedContract.endDate)}
                </p>
              </div>
              {selectedContract.subject && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-xs text-muted-foreground mb-1">Предмет договора</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedContract.subject}</p>
                </div>
              )}
              {selectedContract.paymentTerms && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-xs text-muted-foreground mb-1">Условия оплаты</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedContract.paymentTerms}</p>
                </div>
              )}
              {selectedContract.deliveryTerms && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-xs text-muted-foreground mb-1">Условия поставки</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedContract.deliveryTerms}</p>
                </div>
              )}
              {selectedContract.note && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-xs text-muted-foreground mb-1">Примечание</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedContract.note}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Requisites Block */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-600" />
              Реквизиты заказчика
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Наименование</p>
                <p className="font-medium">{selectedContract.customer.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">ИНН</p>
                <p className="font-medium">{selectedContract.customer.inn || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">КПП</p>
                <p className="font-medium">{selectedContract.customer.kpp || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Юр. адрес</p>
                <p className="font-medium">{selectedContract.customer.legalAddress || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Банк</p>
                <p className="font-medium">{selectedContract.customer.bankName || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">БИК</p>
                <p className="font-medium">{selectedContract.customer.bik || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Р/с</p>
                <p className="font-medium font-mono text-xs">{selectedContract.customer.checkingAccount || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">К/с</p>
                <p className="font-medium font-mono text-xs">{selectedContract.customer.corrAccount || '—'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Our Company Requisites Block (placeholder) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-600" />
              Реквизиты исполнителя
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">
              Реквизиты нашей компании будут настроены в настройках приложения
            </div>
          </CardContent>
        </Card>

        {/* Generate Document Button */}
        <div className="flex justify-center">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] px-8"
            onClick={() => handleGenerateDocument(selectedContract)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Сформировать документ
          </Button>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Редактировать договор</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[72vh] pr-4">
              <ContractFormFields
                number={editNumber} setNumber={setEditNumber}
                customerId={editCustomerId} setCustomerId={setEditCustomerId}
                type={editType} setType={setEditType}
                status={editStatus} setStatus={setEditStatus}
                date={editDate} setDate={setEditDate}
                startDate={editStartDate} setStartDate={setEditStartDate}
                endDate={editEndDate} setEndDate={setEditEndDate}
                subject={editSubject} setSubject={setEditSubject}
                amount={editAmount} setAmount={setEditAmount}
                vatRate={editVatRate} setVatRate={setEditVatRate}
                paymentTerms={editPaymentTerms} setPaymentTerms={setEditPaymentTerms}
                deliveryTerms={editDeliveryTerms} setDeliveryTerms={setEditDeliveryTerms}
                note={editNote} setNote={setEditNote}
                customers={customers}
                selectedCustomer={editSelectedCustomer}
              />
            </ScrollArea>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Отмена</Button>
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

        {/* Delete Confirmation */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить договор?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие нельзя отменить. Договор №&laquo;{selectedContract.number}&raquo; будет удалён навсегда.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deleteMutation.mutate(selectedContract.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // ============ Contracts List View ============

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Договоры</h2>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
          onClick={handleOpenCreate}
        >
          <Plus className="h-4 w-4 mr-2" />
          Новый договор
        </Button>
      </div>

      {/* Contracts Cards Grid */}
      {contracts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-3 opacity-30" />
            <p>Нет договоров</p>
            <p className="text-sm mt-1">Нажмите «Новый договор», чтобы создать первый</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contracts.map((contract) => {
            const statusCfg = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft
            const typeCfg = TYPE_CONFIG[contract.type] || TYPE_CONFIG.service
            const nextStatus = STATUS_FLOW[contract.status]
            const nextLabel = nextStatus ? STATUS_CONFIG[nextStatus]?.label : null

            return (
              <Card
                key={contract.id}
                className={`cursor-pointer hover:shadow-md transition-all border-l-4 ${statusCfg.borderColor} hover:scale-[1.01]`}
                onClick={() => setSelectedContractId(contract.id)}
              >
                <CardContent className="p-4">
                  {/* Card header: Number + Status + Type badges */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">
                        № {contract.number}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        от {formatDate(contract.date)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {statusBadge(contract.status)}
                      {typeBadge(contract.type)}
                    </div>
                  </div>

                  {/* Customer */}
                  <div className="mb-2">
                    <p className="text-sm font-medium">{contract.customer.name}</p>
                    {contract.customer.inn && (
                      <p className="text-xs text-muted-foreground">ИНН {contract.customer.inn}</p>
                    )}
                  </div>

                  {/* Amount */}
                  {contract.amount != null && (
                    <p className="text-sm font-semibold text-emerald-600 mb-2">
                      {formatAmount(contract.amount)}
                      {contract.vatRate > 0 && (
                        <span className="text-xs text-muted-foreground font-normal ml-1">
                          + НДС {contract.vatRate}%
                        </span>
                      )}
                    </p>
                  )}

                  {/* Subject preview */}
                  {contract.subject && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {contract.subject}
                    </p>
                  )}

                  {/* Footer: dates + quick status change */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      {(contract.startDate || contract.endDate) && (
                        <span className="text-xs flex items-center gap-1 text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(contract.startDate)}—{formatDate(contract.endDate)}
                        </span>
                      )}
                    </div>
                    {/* Quick status button */}
                    {nextStatus && nextLabel && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStatusChange(contract.id, nextStatus)
                        }}
                        disabled={statusMutation.isPending}
                        title={`Перевести в «${nextLabel}»`}
                      >
                        {contract.status === 'draft' ? (
                          <Play className="h-3.5 w-3.5 mr-1" />
                        ) : (
                          <Flag className="h-3.5 w-3.5 mr-1" />
                        )}
                        <span className="text-xs">{nextLabel}</span>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ============ Create Contract Dialog ============ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Новый договор</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[72vh] pr-4">
            <ContractFormFields
              number={newNumber} setNumber={setNewNumber}
              customerId={newCustomerId} setCustomerId={setNewCustomerId}
              type={newType} setType={setNewType}
              status={undefined as any} setStatus={undefined as any}
              date={newDate} setDate={setNewDate}
              startDate={newStartDate} setStartDate={setNewStartDate}
              endDate={newEndDate} setEndDate={setNewEndDate}
              subject={newSubject} setSubject={setNewSubject}
              amount={newAmount} setAmount={setNewAmount}
              vatRate={newVatRate} setVatRate={setNewVatRate}
              paymentTerms={newPaymentTerms} setPaymentTerms={setNewPaymentTerms}
              deliveryTerms={newDeliveryTerms} setDeliveryTerms={setNewDeliveryTerms}
              note={newNote} setNote={setNewNote}
              customers={customers}
              selectedCustomer={newSelectedCustomer}
            />
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
              Создать договор
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
