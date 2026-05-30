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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { authFetch } from '@/components/auth-provider'
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Users,
  Phone,
  Mail,
  FileText,
  CalendarDays,
  TrendingUp,
  Briefcase,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'

// ============ Types ============

interface Customer {
  id: string
  name: string
  contactInfo?: string | null
}

interface DealContact {
  id: string
  dealId: string
  date: string
  type: 'meeting' | 'call' | 'email' | 'note'
  result?: string | null
  description?: string | null
  nextStep?: string | null
}

interface Deal {
  id: string
  title: string
  customerId: string
  status: 'new' | 'negotiation' | 'agreed' | 'won' | 'lost' | 'suspended'
  amount?: number | null
  description?: string | null
  result?: string | null
  nextStep?: string | null
  deadline?: string | null
  createdAt: string
  updatedAt: string
  customer: Customer
  contacts: DealContact[]
}

// ============ Status Config ============

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  new: { label: 'Новая', color: 'text-blue-700', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  negotiation: { label: 'Переговоры', color: 'text-amber-700', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
  agreed: { label: 'Договорённость', color: 'text-teal-700', bgColor: 'bg-teal-50', borderColor: 'border-teal-200' },
  won: { label: 'Выиграна', color: 'text-green-700', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  lost: { label: 'Проиграна', color: 'text-red-700', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
  suspended: { label: 'Приостановлена', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
}

const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label }))

// ============ Contact Type Config ============

const CONTACT_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  meeting: { label: 'Встреча', icon: Users, color: 'text-emerald-600' },
  call: { label: 'Звонок', icon: Phone, color: 'text-blue-600' },
  email: { label: 'Письмо', icon: Mail, color: 'text-purple-600' },
  note: { label: 'Заметка', icon: FileText, color: 'text-amber-600' },
}

const CONTACT_TYPE_OPTIONS = Object.entries(CONTACT_TYPE_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label }))

// ============ Helpers ============

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '—'
  return amount.toLocaleString('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' ₽'
}

function formatDate(dateStr: string | null | undefined): string {
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

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
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

function truncate(str: string | null | undefined, max: number): string {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

function isOverdue(deadline: string | null | undefined): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

// ============ Status Badge Component ============

function DealStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.bgColor} ${cfg.color} ${cfg.borderColor} border`}>
      {cfg.label}
    </span>
  )
}

// ============ Main Component ============

export function CRMTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // --- View State ---
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // --- Deal Dialog State ---
  const [createDealOpen, setCreateDealOpen] = useState(false)
  const [editDealOpen, setEditDealOpen] = useState(false)
  const [deleteDealOpen, setDeleteDealOpen] = useState(false)

  // --- Deal Form State ---
  const [dealTitle, setDealTitle] = useState('')
  const [dealCustomerId, setDealCustomerId] = useState('')
  const [dealStatus, setDealStatus] = useState<string>('new')
  const [dealAmount, setDealAmount] = useState('')
  const [dealDescription, setDealDescription] = useState('')
  const [dealResult, setDealResult] = useState('')
  const [dealNextStep, setDealNextStep] = useState('')
  const [dealDeadline, setDealDeadline] = useState('')

  // --- Contact Dialog State ---
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [editContactOpen, setEditContactOpen] = useState(false)
  const [deleteContactOpen, setDeleteContactOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<DealContact | null>(null)

  const [contactType, setContactType] = useState<string>('meeting')
  const [contactDate, setContactDate] = useState('')
  const [contactResult, setContactResult] = useState('')
  const [contactDescription, setContactDescription] = useState('')
  const [contactNextStep, setContactNextStep] = useState('')

  // ============ Queries ============

  const { data: deals = [], isLoading: dealsLoading } = useQuery<Deal[]>({
    queryKey: ['deals'],
    queryFn: async () => {
      const r = await authFetch('/api/deals')
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

  // ============ Computed Values ============

  const selectedDeal = useMemo(
    () => deals.find((d) => d.id === selectedDealId) ?? null,
    [deals, selectedDealId],
  )

  const filteredDeals = useMemo(() => {
    if (statusFilter === 'all') return deals
    return deals.filter((d) => d.status === statusFilter)
  }, [deals, statusFilter])

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {}
    for (const key of Object.keys(STATUS_CONFIG)) {
      byStatus[key] = 0
    }
    let totalAmount = 0
    for (const deal of deals) {
      byStatus[deal.status] = (byStatus[deal.status] || 0) + 1
      if (deal.amount != null && deal.amount > 0) {
        totalAmount += deal.amount
      }
    }
    return { byStatus, totalAmount, total: deals.length }
  }, [deals])

  // ============ Deal Mutations ============

  const createDealMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      authFetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async (r) => {
        const res = await r.json()
        if (!r.ok) throw new Error(res.error || 'Ошибка создания сделки')
        return res
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      setCreateDealOpen(false)
      resetDealForm()
      toast({ title: 'Сделка создана', description: 'Новая сделка успешно добавлена' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  const updateDealMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      authFetch(`/api/deals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async (r) => {
        const res = await r.json()
        if (!r.ok) throw new Error(res.error || 'Ошибка обновления сделки')
        return res
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      setEditDealOpen(false)
      resetDealForm()
      toast({ title: 'Сделка обновлена', description: 'Изменения сохранены' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  const deleteDealMutation = useMutation({
    mutationFn: (id: string) =>
      authFetch(`/api/deals/${id}`, { method: 'DELETE' }).then(async (r) => {
        const res = await r.json()
        if (!r.ok) throw new Error(res.error || 'Ошибка удаления сделки')
        return res
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      setDeleteDealOpen(false)
      setSelectedDealId(null)
      toast({ title: 'Сделка удалена', description: 'Сделка успешно удалена' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  // ============ Contact Mutations ============

  const createContactMutation = useMutation({
    mutationFn: ({ dealId, data }: { dealId: string; data: Record<string, unknown> }) =>
      authFetch(`/api/deals/${dealId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async (r) => {
        const res = await r.json()
        if (!r.ok) throw new Error(res.error || 'Ошибка добавления контакта')
        return res
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      setAddContactOpen(false)
      resetContactForm()
      toast({ title: 'Контакт добавлен', description: 'Новый контакт добавлен в историю' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  const updateContactMutation = useMutation({
    mutationFn: ({ dealId, contactId, data }: { dealId: string; contactId: string; data: Record<string, unknown> }) =>
      authFetch(`/api/deals/${dealId}/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async (r) => {
        const res = await r.json()
        if (!r.ok) throw new Error(res.error || 'Ошибка обновления контакта')
        return res
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      setEditContactOpen(false)
      resetContactForm()
      toast({ title: 'Контакт обновлён', description: 'Изменения сохранены' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  const deleteContactMutation = useMutation({
    mutationFn: ({ dealId, contactId }: { dealId: string; contactId: string }) =>
      authFetch(`/api/deals/${dealId}/contacts/${contactId}`, { method: 'DELETE' }).then(async (r) => {
        const res = await r.json()
        if (!r.ok) throw new Error(res.error || 'Ошибка удаления контакта')
        return res
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
      setDeleteContactOpen(false)
      setSelectedContact(null)
      toast({ title: 'Контакт удалён', description: 'Запись из истории удалена' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  // ============ Form Helpers ============

  function resetDealForm() {
    setDealTitle('')
    setDealCustomerId('')
    setDealStatus('new')
    setDealAmount('')
    setDealDescription('')
    setDealResult('')
    setDealNextStep('')
    setDealDeadline('')
  }

  function resetContactForm() {
    setContactType('meeting')
    setContactDate('')
    setContactResult('')
    setContactDescription('')
    setContactNextStep('')
    setSelectedContact(null)
  }

  function openCreateDeal() {
    resetDealForm()
    setCreateDealOpen(true)
  }

  function openEditDeal(deal: Deal) {
    setDealTitle(deal.title)
    setDealCustomerId(deal.customerId)
    setDealStatus(deal.status)
    setDealAmount(deal.amount != null ? String(deal.amount) : '')
    setDealDescription(deal.description || '')
    setDealResult(deal.result || '')
    setDealNextStep(deal.nextStep || '')
    setDealDeadline(deal.deadline ? deal.deadline.split('T')[0] : '')
    setEditDealOpen(true)
  }

  function openDeleteDeal() {
    setDeleteDealOpen(true)
  }

  function openAddContact() {
    resetContactForm()
    const now = new Date()
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    setContactDate(local)
    setAddContactOpen(true)
  }

  function openEditContact(contact: DealContact) {
    setSelectedContact(contact)
    setContactType(contact.type)
    setContactDate(contact.date ? contact.date.slice(0, 16) : '')
    setContactResult(contact.result || '')
    setContactDescription(contact.description || '')
    setContactNextStep(contact.nextStep || '')
    setEditContactOpen(true)
  }

  function openDeleteContact(contact: DealContact) {
    setSelectedContact(contact)
    setDeleteContactOpen(true)
  }

  // ============ Submit Handlers ============

  const handleCreateDeal = useCallback(() => {
    if (!dealTitle.trim() || !dealCustomerId) {
      toast({ title: 'Ошибка', description: 'Заполните обязательные поля', variant: 'destructive' })
      return
    }
    createDealMutation.mutate({
      title: dealTitle.trim(),
      customerId: dealCustomerId,
      status: dealStatus,
      amount: dealAmount ? Number(dealAmount) : null,
      description: dealDescription.trim() || undefined,
      result: dealResult.trim() || undefined,
      nextStep: dealNextStep.trim() || undefined,
      deadline: dealDeadline || null,
    })
  }, [dealTitle, dealCustomerId, dealStatus, dealAmount, dealDescription, dealResult, dealNextStep, dealDeadline, createDealMutation, toast])

  const handleUpdateDeal = useCallback(() => {
    if (!selectedDeal) return
    updateDealMutation.mutate({
      id: selectedDeal.id,
      data: {
        title: dealTitle.trim(),
        customerId: dealCustomerId,
        status: dealStatus,
        amount: dealAmount ? Number(dealAmount) : null,
        description: dealDescription.trim() || null,
        result: dealResult.trim() || null,
        nextStep: dealNextStep.trim() || null,
        deadline: dealDeadline || null,
      },
    })
  }, [selectedDeal, dealTitle, dealCustomerId, dealStatus, dealAmount, dealDescription, dealResult, dealNextStep, dealDeadline, updateDealMutation])

  const handleCreateContact = useCallback(() => {
    if (!selectedDeal) return
    createContactMutation.mutate({
      dealId: selectedDeal.id,
      data: {
        type: contactType,
        date: contactDate || undefined,
        result: contactResult.trim() || undefined,
        description: contactDescription.trim() || undefined,
        nextStep: contactNextStep.trim() || undefined,
      },
    })
  }, [selectedDeal, contactType, contactDate, contactResult, contactDescription, contactNextStep, createContactMutation])

  const handleUpdateContact = useCallback(() => {
    if (!selectedDeal || !selectedContact) return
    updateContactMutation.mutate({
      dealId: selectedDeal.id,
      contactId: selectedContact.id,
      data: {
        type: contactType,
        date: contactDate || undefined,
        result: contactResult.trim() || null,
        description: contactDescription.trim() || null,
        nextStep: contactNextStep.trim() || null,
      },
    })
  }, [selectedDeal, selectedContact, contactType, contactDate, contactResult, contactDescription, contactNextStep, updateContactMutation])

  // ============ Loading State ============

  if (dealsLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  // ============ Deal Detail View ============

  if (selectedDeal) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="self-start text-emerald-600 hover:text-emerald-700"
            onClick={() => setSelectedDealId(null)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            К списку сделок
          </Button>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{selectedDeal.title}</h2>
            <p className="text-sm text-muted-foreground">{selectedDeal.customer.name}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() => openEditDeal(selectedDeal)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Редактировать
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={openDeleteDeal}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </Button>
          </div>
        </div>

        {/* Deal Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-emerald-600" />
              Информация о сделке
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Статус</p>
                <DealStatusBadge status={selectedDeal.status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Сумма</p>
                <p className="font-semibold text-emerald-600">{formatCurrency(selectedDeal.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Заказчик</p>
                <p className="font-medium">{selectedDeal.customer.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Дедлайн</p>
                <p className={`font-medium ${isOverdue(selectedDeal.deadline) ? 'text-red-600' : ''}`}>
                  {isOverdue(selectedDeal.deadline) && <AlertCircle className="inline h-4 w-4 mr-1" />}
                  {formatDate(selectedDeal.deadline)}
                </p>
              </div>
              {selectedDeal.nextStep && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground mb-1">Следующий шаг</p>
                  <div className="flex items-start gap-2 p-2 rounded-md bg-emerald-50 border border-emerald-200">
                    <ChevronRight className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium text-emerald-800">{selectedDeal.nextStep}</p>
                  </div>
                </div>
              )}
              {selectedDeal.description && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-xs text-muted-foreground mb-1">Описание</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedDeal.description}</p>
                </div>
              )}
              {selectedDeal.result && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <p className="text-xs text-muted-foreground mb-1">Результат</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedDeal.result}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contacts / Meeting History */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                История контактов
                <Badge variant="secondary" className="ml-1">{selectedDeal.contacts.length}</Badge>
              </CardTitle>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
                onClick={openAddContact}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить контакт
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedDeal.contacts.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>Контакты ещё не добавлены</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-0">
                  {selectedDeal.contacts.map((contact, idx) => {
                    const cfg = CONTACT_TYPE_CONFIG[contact.type] || CONTACT_TYPE_CONFIG.note
                    const Icon = cfg.icon
                    return (
                      <div key={contact.id}>
                        {idx > 0 && <Separator className="my-3" />}
                        <div className="flex gap-3">
                          <div className={`shrink-0 mt-1 ${cfg.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium">
                                  {cfg.label}
                                  <span className="text-muted-foreground font-normal ml-2">
                                    {formatDateTime(contact.date)}
                                  </span>
                                </p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => openEditContact(contact)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                  onClick={() => openDeleteContact(contact)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            {contact.result && (
                              <p className="text-sm mt-1 font-medium">{contact.result}</p>
                            )}
                            {contact.description && (
                              <p className="text-sm mt-1 text-muted-foreground whitespace-pre-wrap">
                                {contact.description}
                              </p>
                            )}
                            {contact.nextStep && (
                              <div className="flex items-start gap-1.5 mt-2 p-1.5 rounded bg-emerald-50 border border-emerald-100">
                                <ChevronRight className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                <p className="text-xs font-medium text-emerald-700">{contact.nextStep}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Edit Deal Dialog */}
        <Dialog open={editDealOpen} onOpenChange={setEditDealOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Редактировать сделку</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <DealFormFields
                title={dealTitle} setTitle={setDealTitle}
                customerId={dealCustomerId} setCustomerId={setDealCustomerId}
                status={dealStatus} setStatus={setDealStatus}
                amount={dealAmount} setAmount={setDealAmount}
                description={dealDescription} setDescription={setDealDescription}
                result={dealResult} setResult={setDealResult}
                nextStep={dealNextStep} setNextStep={setDealNextStep}
                deadline={dealDeadline} setDeadline={setDealDeadline}
                customers={customers}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDealOpen(false)}>Отмена</Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleUpdateDeal}
                  disabled={updateDealMutation.isPending || !dealTitle.trim() || !dealCustomerId}
                >
                  {updateDealMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Сохранить
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Deal Dialog */}
        <Dialog open={deleteDealOpen} onOpenChange={setDeleteDealOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Удалить сделку?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Это действие нельзя отменить. Сделка &laquo;{selectedDeal.title}&raquo; будет удалена навсегда вместе со всей историей контактов.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDealOpen(false)}>Отмена</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deleteDealMutation.mutate(selectedDeal.id)}
                disabled={deleteDealMutation.isPending}
              >
                {deleteDealMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Удалить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Contact Dialog */}
        <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Добавить контакт</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <ContactFormFields
                type={contactType} setType={setContactType}
                date={contactDate} setDate={setContactDate}
                result={contactResult} setResult={setContactResult}
                description={contactDescription} setDescription={setContactDescription}
                nextStep={contactNextStep} setNextStep={setContactNextStep}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddContactOpen(false)}>Отмена</Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleCreateContact}
                  disabled={createContactMutation.isPending}
                >
                  {createContactMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Добавить
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Contact Dialog */}
        <Dialog open={editContactOpen} onOpenChange={setEditContactOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Редактировать контакт</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <ContactFormFields
                type={contactType} setType={setContactType}
                date={contactDate} setDate={setContactDate}
                result={contactResult} setResult={setContactResult}
                description={contactDescription} setDescription={setContactDescription}
                nextStep={contactNextStep} setNextStep={setContactNextStep}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditContactOpen(false)}>Отмена</Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleUpdateContact}
                  disabled={updateContactMutation.isPending}
                >
                  {updateContactMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Сохранить
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Contact Dialog */}
        <Dialog open={deleteContactOpen} onOpenChange={setDeleteContactOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Удалить контакт?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Запись из истории контактов будет удалена навсегда.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteContactOpen(false)}>Отмена</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => {
                  if (selectedDeal && selectedContact) {
                    deleteContactMutation.mutate({
                      dealId: selectedDeal.id,
                      contactId: selectedContact.id,
                    })
                  }
                }}
                disabled={deleteContactMutation.isPending}
              >
                {deleteContactMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Удалить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ============ Deals List View ============

  return (
    <div className="space-y-6">
      {/* Stats Section */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <Card className="col-span-2 sm:col-span-1 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-xs text-muted-foreground">Всего сделок</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <Card key={key}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{cfg.label}</p>
              <p className={`text-xl font-bold ${cfg.color}`}>{stats.byStatus[key] || 0}</p>
            </CardContent>
          </Card>
        ))}
        <Card className="col-span-2 sm:col-span-1 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-xs text-muted-foreground">Общая сумма</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(stats.totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar: Filter + Create */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Label className="text-sm shrink-0">Фильтр:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] w-full sm:w-auto"
          onClick={openCreateDeal}
        >
          <Plus className="h-4 w-4 mr-2" />
          Новая сделка
        </Button>
      </div>

      {/* Deals Cards Grid */}
      {filteredDeals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">
              {statusFilter !== 'all' ? 'Нет сделок с выбранным статусом' : 'Сделки ещё не добавлены'}
            </p>
            <p className="text-sm mt-1">Нажмите «Новая сделка», чтобы создать первую</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDeals.map((deal) => {
            const cfg = STATUS_CONFIG[deal.status] || STATUS_CONFIG.new
            const overdue = isOverdue(deal.deadline)
            return (
              <Card
                key={deal.id}
                className={`cursor-pointer hover:shadow-md transition-all border-l-4 ${cfg.borderColor} hover:scale-[1.01]`}
                onClick={() => setSelectedDealId(deal.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm leading-tight">{deal.title}</h3>
                    <DealStatusBadge status={deal.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{deal.customer.name}</p>

                  {deal.amount != null && deal.amount > 0 && (
                    <p className="text-sm font-semibold text-emerald-600 mb-2">
                      {formatCurrency(deal.amount)}
                    </p>
                  )}

                  {deal.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {truncate(deal.description, 80)}
                    </p>
                  )}

                  {deal.nextStep && (
                    <div className="flex items-start gap-1.5 mb-2 p-1.5 rounded bg-emerald-50 border border-emerald-100">
                      <ChevronRight className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <p className="text-xs font-medium text-emerald-700">{truncate(deal.nextStep, 60)}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      {deal.deadline && (
                        <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatDate(deal.deadline)}
                          {overdue && <AlertCircle className="h-3.5 w-3.5" />}
                        </span>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {deal.contacts.length} контактов
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Deal Dialog */}
      <Dialog open={createDealOpen} onOpenChange={setCreateDealOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Новая сделка</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <DealFormFields
              title={dealTitle} setTitle={setDealTitle}
              customerId={dealCustomerId} setCustomerId={setDealCustomerId}
              status={dealStatus} setStatus={setDealStatus}
              amount={dealAmount} setAmount={setDealAmount}
              description={dealDescription} setDescription={setDealDescription}
              result={dealResult} setResult={setDealResult}
              nextStep={dealNextStep} setNextStep={setDealNextStep}
              deadline={dealDeadline} setDeadline={setDealDeadline}
              customers={customers}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDealOpen(false)}>Отмена</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleCreateDeal}
                disabled={createDealMutation.isPending || !dealTitle.trim() || !dealCustomerId}
              >
                {createDealMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Создать
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============ Sub-Components ============

function DealFormFields({
  title, setTitle,
  customerId, setCustomerId,
  status, setStatus,
  amount, setAmount,
  description, setDescription,
  result, setResult,
  nextStep, setNextStep,
  deadline, setDeadline,
  customers,
}: {
  title: string; setTitle: (v: string) => void
  customerId: string; setCustomerId: (v: string) => void
  status: string; setStatus: (v: string) => void
  amount: string; setAmount: (v: string) => void
  description: string; setDescription: (v: string) => void
  result: string; setResult: (v: string) => void
  nextStep: string; setNextStep: (v: string) => void
  deadline: string; setDeadline: (v: string) => void
  customers: Customer[]
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>Название <span className="text-red-500">*</span></Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Поставка тканей Q3" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Заказчик <span className="text-red-500">*</span></Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите заказчика" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Статус</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Сумма (₽)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div className="space-y-2">
          <Label>Дедлайн</Label>
          <Input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Описание</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Описание сделки..."
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Результат</Label>
        <Textarea
          value={result}
          onChange={(e) => setResult(e.target.value)}
          placeholder="Итог или результат переговоров..."
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label>Следующий шаг</Label>
        <Input
          value={nextStep}
          onChange={(e) => setNextStep(e.target.value)}
          placeholder="Подготовить КП до 15.03"
        />
      </div>
    </>
  )
}

function ContactFormFields({
  type, setType,
  date, setDate,
  result, setResult,
  description, setDescription,
  nextStep, setNextStep,
}: {
  type: string; setType: (v: string) => void
  date: string; setDate: (v: string) => void
  result: string; setResult: (v: string) => void
  description: string; setDescription: (v: string) => void
  nextStep: string; setNextStep: (v: string) => void
}) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Тип контакта</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Дата</Label>
          <Input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Результат</Label>
        <Textarea
          value={result}
          onChange={(e) => setResult(e.target.value)}
          placeholder="Краткий итог встречи / звонка..."
          rows={2}
        />
      </div>
      <div className="space-y-2">
        <Label>Описание</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Подробности обсуждения..."
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Следующий шаг</Label>
        <Input
          value={nextStep}
          onChange={(e) => setNextStep(e.target.value)}
          placeholder="Отправить договор до пятницы"
        />
      </div>
    </>
  )
}
