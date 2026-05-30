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
import { Loader2, Plus, Package, Truck, Printer } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { SellerPlan, Box } from '@/types'
import { getColorDot, getBoxStatusBadge } from '@/lib/status-badges'

export function BoxesTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false)
  const [selectedSellerPlanId, setSelectedSellerPlanId] = useState('')
  const [actualQtys, setActualQtys] = useState<Record<string, string>>({})

  const { data: boxes = [], isLoading } = useQuery({
    queryKey: ['boxes'],
    queryFn: async () => {
      const r = await fetch('/api/boxes')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: sellerPlans = [] } = useQuery({
    queryKey: ['seller-plans'],
    queryFn: async () => {
      const r = await fetch('/api/seller-plans')
      const data = await r.json()
      return Array.isArray(data) ? data : []
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

  const handleBoxPrint = useCallback(async (boxId: string) => {
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
                          onClick={() => handleBoxPrint(box.id)}
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
