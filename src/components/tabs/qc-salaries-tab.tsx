'use client'

import { useState, useEffect, useCallback } from 'react'
import { authFetch } from '@/components/auth-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Loader2, DollarSign, CheckCircle, Clock, Eye, Wallet, Filter } from 'lucide-react'

// ---- Types ----
interface QcSalaryItem {
  id: string
  productId: string
  size: string
  quantity: number
  rate: number
  amount: number
  product: { id: string; name: string; article: string }
}

interface QcSalary {
  id: string
  planId: string
  employeeId: string
  totalAmount: number
  totalItems: number
  status: 'calculated' | 'paid'
  paidAt: string | null
  createdAt: string
  updatedAt: string
  plan: {
    id: string
    name: string
    customer: { id: string; name: string } | null
  }
  employee: { id: string; name: string; code: string }
  items: QcSalaryItem[]
}

// ---- Helpers ----
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(value)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ---- Component ----
export function QcSalariesTab() {
  const [salaries, setSalaries] = useState<QcSalary[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [employeeFilter, setEmployeeFilter] = useState<string>('all')
  const [selectedSalary, setSelectedSalary] = useState<QcSalary | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)

  // Unique employee list from loaded data
  const employees = (() => {
    const map = new Map<string, string>()
    for (const s of salaries) {
      if (!map.has(s.employeeId)) {
        map.set(s.employeeId, s.employee.name)
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  })()

  const fetchSalaries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (employeeFilter !== 'all') params.set('employeeId', employeeFilter)
      const res = await authFetch(`/api/qc-salaries?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setSalaries(data)
      }
    } catch (err) {
      console.error('Failed to fetch QC salaries:', err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, employeeFilter])

  useEffect(() => {
    fetchSalaries()
  }, [fetchSalaries])

  const handleMarkPaid = async (salaryId: string) => {
    setMarkingPaid(salaryId)
    try {
      const res = await authFetch(`/api/qc-salaries/${salaryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paid' }),
      })
      if (res.ok) {
        const updated = await res.json()
        setSalaries((prev) => prev.map((s) => (s.id === salaryId ? updated : s)))
        if (selectedSalary?.id === salaryId) {
          setSelectedSalary(updated)
        }
      }
    } catch (err) {
      console.error('Failed to mark as paid:', err)
    } finally {
      setMarkingPaid(null)
    }
  }

  const handleRevertToCalculated = async (salaryId: string) => {
    setMarkingPaid(salaryId)
    try {
      const res = await authFetch(`/api/qc-salaries/${salaryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'calculated' }),
      })
      if (res.ok) {
        const updated = await res.json()
        setSalaries((prev) => prev.map((s) => (s.id === salaryId ? updated : s)))
        if (selectedSalary?.id === salaryId) {
          setSelectedSalary(updated)
        }
      }
    } catch (err) {
      console.error('Failed to revert:', err)
    } finally {
      setMarkingPaid(null)
    }
  }

  const openDetail = (salary: QcSalary) => {
    setSelectedSalary(salary)
    setShowDetail(true)
  }

  // Summary stats
  const totalCalculated = salaries
    .filter((s) => s.status === 'calculated')
    .reduce((sum, s) => sum + s.totalAmount, 0)
  const totalPaid = salaries
    .filter((s) => s.status === 'paid')
    .reduce((sum, s) => sum + s.totalAmount, 0)
  const totalItems = salaries.reduce((sum, s) => sum + s.totalItems, 0)
  const calculatedCount = salaries.filter((s) => s.status === 'calculated').length
  const paidCount = salaries.filter((s) => s.status === 'paid').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Зарплата ОТК</h2>
        <p className="text-muted-foreground mt-1">
          Начисление зарплаты сотрудникам ОТК при отгрузке планов. Зарплата рассчитывается автоматически на основе количества изделий и ставок.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-600" />
              <div>
                <div className="text-sm text-amber-700">К начислению</div>
                <div className="text-xl font-bold text-amber-900">{formatCurrency(totalCalculated)}</div>
                <div className="text-xs text-amber-600">{calculatedCount} записей</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
              <div>
                <div className="text-sm text-emerald-700">Выплачено</div>
                <div className="text-xl font-bold text-emerald-900">{formatCurrency(totalPaid)}</div>
                <div className="text-xs text-emerald-600">{paidCount} записей</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-sm text-blue-700">Всего</div>
                <div className="text-xl font-bold text-blue-900">{formatCurrency(totalCalculated + totalPaid)}</div>
                <div className="text-xs text-blue-600">{salaries.length} записей</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-sm text-purple-700">Изделий проверено</div>
                <div className="text-xl font-bold text-purple-900">{totalItems}</div>
                <div className="text-xs text-purple-600">всего единиц</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Статус:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="calculated">К начислению</SelectItem>
                  <SelectItem value="paid">Выплачено</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Сотрудник:</span>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все сотрудники</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salaries table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Начисления</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              <span className="ml-2 text-muted-foreground">Загрузка...</span>
            </div>
          ) : salaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <DollarSign className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-lg font-medium">Нет начислений</p>
              <p className="text-sm mt-1">Зарплата ОТК начисляется автоматически при отгрузке плана</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата начисления</TableHead>
                    <TableHead>План</TableHead>
                    <TableHead>Заказчик</TableHead>
                    <TableHead>Сотрудник ОТК</TableHead>
                    <TableHead className="text-center">Кол-во изделий</TableHead>
                    <TableHead className="text-right">Сумма</TableHead>
                    <TableHead className="text-center">Статус</TableHead>
                    <TableHead className="text-center">Дата выплаты</TableHead>
                    <TableHead className="text-center">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaries.map((salary) => (
                    <TableRow key={salary.id} className={salary.status === 'paid' ? 'opacity-70' : ''}>
                      <TableCell className="text-sm">{formatDateTime(salary.createdAt)}</TableCell>
                      <TableCell>
                        <span className="font-medium text-sm">{salary.plan.name}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {salary.plan.customer?.name || '—'}
                      </TableCell>
                      <TableCell className="text-sm">{salary.employee.name}</TableCell>
                      <TableCell className="text-center text-sm">{salary.totalItems}</TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {formatCurrency(salary.totalAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {salary.status === 'calculated' ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            К начислению
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            Выплачено
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {salary.paidAt ? formatDate(salary.paidAt) : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetail(salary)}
                            title="Подробнее"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {salary.status === 'calculated' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleMarkPaid(salary.id)}
                              disabled={markingPaid === salary.id}
                              title="Отметить как выплачено"
                            >
                              {markingPaid === salary.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {salary.status === 'paid' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => handleRevertToCalculated(salary.id)}
                              disabled={markingPaid === salary.id}
                              title="Вернуть к начислению"
                            >
                              {markingPaid === salary.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Clock className="h-4 w-4" />
                              )}
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
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Детали начисления зарплаты ОТК</DialogTitle>
          </DialogHeader>
          {selectedSalary && (
            <div className="space-y-4">
              {/* Info header */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">План:</span>{' '}
                  <span className="font-medium">{selectedSalary.plan.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Заказчик:</span>{' '}
                  <span className="font-medium">{selectedSalary.plan.customer?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Сотрудник ОТК:</span>{' '}
                  <span className="font-medium">{selectedSalary.employee.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Дата начисления:</span>{' '}
                  <span className="font-medium">{formatDateTime(selectedSalary.createdAt)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Статус:</span>{' '}
                  {selectedSalary.status === 'calculated' ? (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 ml-1">
                      К начислению
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 ml-1">
                      Выплачено {selectedSalary.paidAt ? formatDate(selectedSalary.paidAt) : ''}
                    </Badge>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Итого изделий:</span>{' '}
                  <span className="font-medium">{selectedSalary.totalItems}</span>
                </div>
              </div>

              <Separator />

              {/* Items table */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Разбивка по изделиям</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Изделие</TableHead>
                      <TableHead>Артикул</TableHead>
                      <TableHead>Размер</TableHead>
                      <TableHead className="text-center">Кол-во</TableHead>
                      <TableHead className="text-right">Ставка</TableHead>
                      <TableHead className="text-right">Сумма</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSalary.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm font-medium">{item.product.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.product.article}</TableCell>
                        <TableCell className="text-sm">{item.size}</TableCell>
                        <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(item.rate)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              {/* Total */}
              <div className="flex justify-between items-center bg-gray-50 rounded-lg p-4">
                <span className="font-semibold">Итого:</span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-700">
                    {formatCurrency(selectedSalary.totalAmount)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedSalary.totalItems} изд.
                  </div>
                </div>
              </div>

              {/* Actions */}
              <DialogFooter>
                {selectedSalary.status === 'calculated' && (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => {
                      handleMarkPaid(selectedSalary.id)
                      setShowDetail(false)
                    }}
                    disabled={markingPaid === selectedSalary.id}
                  >
                    {markingPaid === selectedSalary.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Отметить как выплачено
                  </Button>
                )}
                {selectedSalary.status === 'paid' && (
                  <Button
                    variant="outline"
                    className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={() => {
                      handleRevertToCalculated(selectedSalary.id)
                      setShowDetail(false)
                    }}
                    disabled={markingPaid === selectedSalary.id}
                  >
                    {markingPaid === selectedSalary.id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Clock className="h-4 w-4 mr-2" />
                    )}
                    Вернуть к начислению
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowDetail(false)}>
                  Закрыть
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
