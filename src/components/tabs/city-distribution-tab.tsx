'use client'

import { useState, useCallback, useMemo, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Loader2, Plus, X, CheckCircle2, MapPin, Truck, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Plan, SellerPlan } from '@/types'
import { formatDate } from '@/lib/formatters'
import { getColorDot, getSellerPlanStatusBadge } from '@/lib/status-badges'

export function CityDistributionTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // --- New distribution state ---
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [distributionItems, setDistributionItems] = useState<Array<{
    planItemId: string
    productId: string
    size: string
    color: string
    colorHex: string
    totalQty: number
    cities: Array<{ city: string; quantity: number }>
  }>>([])
  const [sellerPlanName, setSellerPlanName] = useState('')

  // --- Data queries ---
  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const r = await fetch('/api/plans')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: sellerPlans = [], isLoading } = useQuery({
    queryKey: ['seller-plans'],
    queryFn: async () => {
      const r = await fetch('/api/seller-plans')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: cities = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const r = await fetch('/api/cities')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  // --- Filter plans to only approved or in_work ---
  const eligiblePlans = useMemo(
    () => (plans as Plan[]).filter((p) => p.status === 'approved' || p.status === 'in_work'),
    [plans]
  )

  // --- Group eligible plans by customer ---
  const plansByCustomer = useMemo(() => {
    const groups: Record<string, { customerName: string; plans: Plan[] }> = {}
    for (const plan of eligiblePlans) {
      const key = plan.customer?.id || '__no_customer__'
      if (!groups[key]) {
        groups[key] = { customerName: plan.customer?.name || 'Без заказчика', plans: [] }
      }
      groups[key].plans.push(plan)
    }
    return Object.values(groups)
  }, [eligiblePlans])

  // --- Selected plan reference ---
  const selectedPlan = useMemo(
    () => (plans as Plan[]).find((p) => p.id === selectedPlanId),
    [plans, selectedPlanId]
  )

  // --- Handle plan selection ---
  const handlePlanSelect = useCallback((planId: string) => {
    setSelectedPlanId(planId)
    const plan = (plans as Plan[]).find((p) => p.id === planId)
    if (plan) {
      const items = plan.items.map((item) => ({
        planItemId: item.id,
        productId: item.productId,
        size: item.size,
        color: item.color,
        colorHex: item.colorHex,
        totalQty: item.quantity,
        cities: [] as Array<{ city: string; quantity: number }>,
      }))
      setDistributionItems(items)
      setSellerPlanName(plan.name)
    } else {
      setDistributionItems([])
      setSellerPlanName('')
    }
  }, [plans])

  // --- City management per item ---
  const addCityToItem = useCallback((itemIndex: number) => {
    setDistributionItems((prev) =>
      prev.map((item, i) =>
        i === itemIndex ? { ...item, cities: [...item.cities, { city: '', quantity: 0 }] } : item
      )
    )
  }, [])

  const removeCityFromItem = useCallback((itemIndex: number, cityIndex: number) => {
    setDistributionItems((prev) =>
      prev.map((item, i) =>
        i === itemIndex ? { ...item, cities: item.cities.filter((_, ci) => ci !== cityIndex) } : item
      )
    )
  }, [])

  const updateCityInItem = useCallback((itemIndex: number, cityIndex: number, field: string, value: string | number) => {
    setDistributionItems((prev) =>
      prev.map((item, i) =>
        i === itemIndex
          ? { ...item, cities: item.cities.map((c, ci) => (ci === cityIndex ? { ...c, [field]: value } : c)) }
          : item
      )
    )
  }, [])

  // --- Distribution calculations ---
  const getItemDistributed = useCallback((item: typeof distributionItems[number]) =>
    item.cities.reduce((sum, c) => sum + (c.quantity || 0), 0), [])

  // --- Overall progress ---
  const overallProgress = useMemo(() => {
    let totalQty = 0
    let totalDistributed = 0
    for (const item of distributionItems) {
      totalQty += item.totalQty
      totalDistributed += item.cities.reduce((s, c) => s + (c.quantity || 0), 0)
    }
    return { totalQty, totalDistributed, percent: totalQty > 0 ? Math.round((totalDistributed / totalQty) * 100) : 0 }
  }, [distributionItems])

  // --- Create mutation ---
  const createMutation = useMutation({
    mutationFn: (data: {
      sellerName: string
      customerId: string
      planId: string
      items: Array<{
        productId: string; size: string; color: string; colorHex: string; quantity: number
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
      setSelectedPlanId('')
      setDistributionItems([])
      setSellerPlanName('')
      toast({ title: 'План создан', description: 'План распределения создан' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось создать план', variant: 'destructive' })
    },
  })

  // --- Existing plan mutations ---
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

  const markDistributedMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/seller-plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'distributed' }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-plans'] })
      toast({ title: 'Распределено', description: 'План отмечен как распределённый' })
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось обновить статус', variant: 'destructive' })
    },
  })

  // --- Handle create ---
  const handleCreate = useCallback(() => {
    if (!selectedPlanId) {
      toast({ title: 'Ошибка', description: 'Выберите план заказчика', variant: 'destructive' })
      return
    }
    if (!sellerPlanName.trim()) {
      toast({ title: 'Ошибка', description: 'Укажите название плана', variant: 'destructive' })
      return
    }
    if (distributionItems.length === 0) {
      toast({ title: 'Ошибка', description: 'Нет позиций для распределения', variant: 'destructive' })
      return
    }

    // Validate: each item must have all quantity distributed
    const undistributedItems = distributionItems.filter((item) => {
      const distributed = item.cities.reduce((s, c) => s + (c.quantity || 0), 0)
      return distributed !== item.totalQty
    })
    if (undistributedItems.length > 0) {
      toast({
        title: 'Ошибка',
        description: `Не все позиции распределены: ${undistributedItems.length} из ${distributionItems.length} позиций имеют нераспределённое количество`,
        variant: 'destructive',
      })
      return
    }

    // Validate: all city entries must have city selected
    const emptyCities = distributionItems.some((item) =>
      item.cities.some((c) => !c.city)
    )
    if (emptyCities) {
      toast({ title: 'Ошибка', description: 'Укажите город для всех записей распределения', variant: 'destructive' })
      return
    }

    const itemsPayload = distributionItems.map((item) => ({
      productId: item.productId,
      size: item.size,
      color: item.color,
      colorHex: item.colorHex,
      quantity: item.totalQty,
      cities: item.cities,
    }))

    createMutation.mutate({
      sellerName: sellerPlanName,
      customerId: selectedPlan!.customerId!,
      planId: selectedPlanId,
      items: itemsPayload,
    })
  }, [selectedPlanId, sellerPlanName, distributionItems, selectedPlan, createMutation, toast])

  // --- Compute distribution progress for existing plan ---
  const getDistributionProgress = useCallback((plan: SellerPlan) => {
    let totalQty = 0
    let totalDistributed = 0
    for (const item of plan.items) {
      totalQty += item.quantity
      totalDistributed += item.cities.reduce((sum, c) => sum + c.quantity, 0)
    }
    return { totalQty, totalDistributed, percent: totalQty > 0 ? Math.round((totalDistributed / totalQty) * 100) : 0 }
  }, [])

  // getSellerPlanStatusBadge is imported from @/lib/status-badges

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
      <h2 className="text-xl font-semibold">Распределение по городам</h2>

      {/* ========= Section 1: New distribution ========= */}
      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-600" />
            Новое распределение
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Plan selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>План заказчика <span className="text-red-500">*</span></Label>
              <Select value={selectedPlanId} onValueChange={handlePlanSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите план" />
                </SelectTrigger>
                <SelectContent>
                  {plansByCustomer.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                      Нет утверждённых планов
                    </div>
                  ) : (
                    plansByCustomer.map((group) => (
                      <Fragment key={group.customerName}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {group.customerName}
                        </div>
                        {group.plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            <span className="flex items-center gap-2">
                              {plan.name}
                              <span className="text-xs text-muted-foreground">({plan.items.length} поз.)</span>
                            </span>
                          </SelectItem>
                        ))}
                      </Fragment>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Название плана распределения</Label>
              <Input
                placeholder="Выберите план заказчика"
                value={sellerPlanName}
                readOnly
                className="bg-gray-50"
              />
            </div>
          </div>

          {/* No eligible plans hint */}
          {eligiblePlans.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Нет планов со статусом «Утверждён» или «В работе». Сначала создайте и утвердите план пошива.
            </div>
          )}

          {/* Distribution table (shown when a plan is selected) */}
          {selectedPlanId && distributionItems.length > 0 && (
            <>
              <Separator />

              {/* Overall progress */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Общее распределение: {overallProgress.totalDistributed} из {overallProgress.totalQty} шт</span>
                    <span className={overallProgress.percent === 100 ? 'text-emerald-600 font-medium' : overallProgress.percent > 0 ? 'text-amber-600' : 'text-gray-400'}>
                      {overallProgress.percent}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${overallProgress.percent === 100 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                      style={{ width: `${overallProgress.percent}%` }}
                    />
                  </div>
                </div>
                {overallProgress.percent === 100 && (
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 whitespace-nowrap">
                    <CheckCircle2 className="h-3 w-3 mr-1" />Распределено
                  </Badge>
                )}
              </div>

              {/* Distribution items table */}
              <div className="border rounded-lg overflow-hidden">
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Изделие</TableHead>
                        <TableHead>Размер</TableHead>
                        <TableHead>Цвет</TableHead>
                        <TableHead className="text-center">Всего</TableHead>
                        <TableHead className="text-center">Распределено</TableHead>
                        <TableHead className="text-center">Не распределено</TableHead>
                        <TableHead className="min-w-[280px]">Города</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distributionItems.map((item, itemIndex) => {
                        const product = selectedPlan?.items.find((pi) => pi.id === item.planItemId)?.product
                        const distributed = getItemDistributed(item)
                        const undistributed = item.totalQty - distributed
                        const isFullyDistributed = distributed === item.totalQty && item.totalQty > 0

                        return (
                          <TableRow key={item.planItemId} className={isFullyDistributed ? 'bg-emerald-50/50' : ''}>
                            <TableCell className="font-medium text-sm">
                              {product?.name || '—'}
                            </TableCell>
                            <TableCell className="text-sm">{item.size}</TableCell>
                            <TableCell className="text-sm">
                              <span className="flex items-center">
                                {getColorDot(item.colorHex)}
                                {item.color}
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-sm font-medium">{item.totalQty}</TableCell>
                            <TableCell className="text-center text-sm">
                              <span className={isFullyDistributed ? 'text-emerald-600 font-medium' : distributed > 0 ? 'text-amber-600' : 'text-gray-400'}>
                                {distributed}
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {isFullyDistributed ? (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">Распределено</Badge>
                              ) : (
                                <span className={undistributed > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}>
                                  {undistributed}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1.5">
                                {item.cities.map((city, cityIndex) => (
                                  <div key={cityIndex} className="flex items-center gap-1.5">
                                    <Select
                                      value={city.city}
                                      onValueChange={(v) => updateCityInItem(itemIndex, cityIndex, 'city', v)}
                                    >
                                      <SelectTrigger className="w-32 h-7 text-xs">
                                        <SelectValue placeholder="Город" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(cities as Array<{ id: string; name: string }>).map((c) => (
                                          <SelectItem key={c.id} value={c.name} className="text-xs">
                                            {c.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      type="number"
                                      className="w-16 h-7 text-xs text-center"
                                      placeholder="Кол-во"
                                      min="0"
                                      value={city.quantity || ''}
                                      onChange={(e) => updateCityInItem(itemIndex, cityIndex, 'quantity', parseInt(e.target.value) || 0)}
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0 shrink-0"
                                      onClick={() => removeCityFromItem(itemIndex, cityIndex)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => addCityToItem(itemIndex)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Добавить город
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              {/* Create button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedPlanId('')
                    setDistributionItems([])
                    setSellerPlanName('')
                  }}
                >
                  Сбросить
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleCreate}
                  disabled={createMutation.isPending || distributionItems.length === 0}
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <MapPin className="h-4 w-4 mr-1" />
                  Создать план распределения
                </Button>
              </div>
            </>
          )}

          {/* Hint when no plan selected yet but plans exist */}
          {eligiblePlans.length > 0 && !selectedPlanId && (
            <div className="text-sm text-muted-foreground text-center py-4">
              Выберите план заказчика для создания распределения по городам
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========= Section 2: Existing distributions ========= */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Существующие распределения</h3>

        {sellerPlans.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Truck className="h-12 w-12 mb-3 opacity-30" />
              <p>Нет планов распределения</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sellerPlans.map((sp: SellerPlan) => {
              const progress = getDistributionProgress(sp)
              const isFullyDistributed = progress.percent === 100 && progress.totalQty > 0
              return (
                <Card key={sp.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle className="text-base">{sp.sellerName}</CardTitle>
                        {sp.customer && (
                          <p className="text-xs text-muted-foreground mt-0.5">Заказчик: {sp.customer.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{formatDate(sp.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getSellerPlanStatusBadge(sp.status)}
                        {sp.status === 'draft' && (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => approveMutation.mutate(sp.id)} disabled={approveMutation.isPending}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />Утвердить
                          </Button>
                        )}
                        {sp.status === 'approved' && isFullyDistributed && (
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => markDistributedMutation.mutate(sp.id)} disabled={markDistributedMutation.isPending}>
                            <MapPin className="h-4 w-4 mr-1" />Распределено
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Distribution progress bar */}
                    <div className="px-4 pb-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span>Распределение: {progress.totalDistributed} из {progress.totalQty} шт</span>
                        <span className={progress.percent === 100 ? 'text-emerald-600 font-medium' : progress.percent > 0 ? 'text-amber-600' : 'text-gray-400'}>
                          {progress.percent}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${progress.percent === 100 ? 'bg-emerald-500' : 'bg-amber-400'}`}
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                    </div>
                    {/* Items table */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Изделие</TableHead>
                            <TableHead>Размер</TableHead>
                            <TableHead>Цвет</TableHead>
                            <TableHead className="text-center">Всего</TableHead>
                            <TableHead className="text-center">Распределено</TableHead>
                            <TableHead className="text-center">Не распределено</TableHead>
                            <TableHead>Города</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sp.items.map((item) => {
                            const distributed = item.cities.reduce((sum, c) => sum + c.quantity, 0)
                            const undistributed = item.quantity - distributed
                            return (
                              <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.product.name}</TableCell>
                                <TableCell>{item.size}</TableCell>
                                <TableCell>
                                  <span className="flex items-center">
                                    {getColorDot(item.colorHex)}
                                    {item.color}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-center">
                                  <span className={distributed === item.quantity ? 'text-emerald-600 font-medium' : distributed > 0 ? 'text-amber-600' : 'text-gray-400'}>
                                    {distributed}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  {undistributed === 0 && item.quantity > 0 ? (
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px]">Распределено</Badge>
                                  ) : (
                                    <span className={undistributed > 0 ? 'text-red-500 font-medium' : ''}>
                                      {undistributed}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {item.cities.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {item.cities.map((c, ci) => (
                                        <Badge key={ci} variant="outline" className="text-[10px]">
                                          {c.city}: {c.quantity}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
