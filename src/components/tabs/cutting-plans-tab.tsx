'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Scissors, Printer, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { authFetch } from '@/components/auth-provider'
import type { CuttingPlan, CuttingLeftover } from '@/types'
import { formatDate, printDocument } from '@/lib/formatters'
import { getColorDot, getCuttingStatusBadge } from '@/lib/status-badges'

export function CuttingPlansTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [actualQtys, setActualQtys] = useState<Record<string, string>>({})

  const { data: cuttingPlans = [], isLoading } = useQuery({
    queryKey: ['cutting-plans'],
    queryFn: async () => {
      const r = await authFetch('/api/cutting-plans')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string; items?: Array<{ id: string; actualQty: number | null }> } }) =>
      authFetch(`/api/cutting-plans/${id}`, {
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => printDocument('cutting-plan', cp.id)}
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Печать
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Изделие</TableHead>
                        <TableHead>Артикул</TableHead>
                        <TableHead>Размер</TableHead>
                        <TableHead>Цвет</TableHead>
                        <TableHead className="text-center">План</TableHead>
                        <TableHead className="text-center">Факт</TableHead>
                        <TableHead className="text-center">Остаток</TableHead>
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
                            <TableCell className="text-center">
                              {item.actualQty !== null && item.actualQty > item.plannedQty ? (
                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                  +{item.actualQty - item.plannedQty}
                                </Badge>
                              ) : '—'}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              {cp.leftovers && cp.leftovers.length > 0 && (
                <div className="px-4 pb-4">
                  <div className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Остатки кроя ({cp.leftovers.length})
                  </div>
                  <div className="space-y-1">
                    {cp.leftovers.map((lo: CuttingLeftover) => (
                      <div key={lo.id} className="flex items-center gap-2 text-xs bg-amber-50 rounded px-2 py-1">
                        <span className="font-medium">{lo.product.name}</span>
                        <span className="text-muted-foreground">{lo.size}</span>
                        <span className="flex items-center"><span style={{ backgroundColor: lo.colorHex }} className="inline-block w-2 h-2 rounded-full mr-1" />{lo.color}</span>
                        <span className="font-semibold">+{lo.quantity} шт</span>
                        {lo.sewnQty > 0 && <span className="text-emerald-600">пошито: {lo.sewnQty}</span>}
                        <Badge variant="outline" className="text-[10px]">{lo.status === 'free' ? 'свободно' : lo.status === 'partially_sewn' ? 'частично пошито' : 'полностью пошито'}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
