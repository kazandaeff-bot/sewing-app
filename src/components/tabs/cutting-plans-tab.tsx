'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Loader2, Scissors, Printer, AlertTriangle, Plus, Trash2, Layers, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { authFetch, authFetchJson } from '@/components/auth-provider'
import type { CuttingPlan, CuttingLeftover } from '@/types'
import { formatDate, printDocument } from '@/lib/formatters'
import { getColorDot, getCuttingStatusBadge } from '@/lib/status-badges'

// Тип для захода раскроя
interface CuttingPassItem {
  id: string
  passNumber: number
  layers: number
  actualQty: number | null
  note: string | null
}

// Локальное состояние редактируемого захода
interface PassEdit {
  passNumber: number
  layers: number
  actualQty: number
  note: string
}

export function CuttingPlansTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [actualQtys, setActualQtys] = useState<Record<string, string>>({})

  // Состояние раскрытых строк (какие позиции показывают заходы)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  // Диалог редактирования заходов
  const [passesDialogOpen, setPassesDialogOpen] = useState(false)
  const [passesDialogItemId, setPassesDialogItemId] = useState<string>('')
  const [passesEditData, setPassesEditData] = useState<PassEdit[]>([])

  const { data: cuttingPlans = [], isLoading } = useQuery({
    queryKey: ['cutting-plans'],
    queryFn: async () => {
      const r = await authFetch('/api/cutting-plans')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status?: string; items?: Array<{ id: string; actualQty: number | null; bundleCount?: number | null }> } }) =>
      authFetch(`/api/cutting-plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async (r) => {
        const result = await r.json()
        if (!r.ok) throw new Error(result.error || 'Не удалось обновить план раскроя')
        return result
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cutting-plans'] })
      toast({ title: 'Обновлено', description: 'План раскроя обновлён' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  // Мутация: сохранить заходы
  const savePassesMutation = useMutation({
    mutationFn: async ({ cuttingPlanItemId, passes }: { cuttingPlanItemId: string; passes: PassEdit[] }) => {
      const result = await authFetchJson('/api/cutting-passes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuttingPlanItemId, passes }),
      })
      return result
    },
    onSuccess: () => {
      setPassesDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['cutting-plans'] })
      toast({ title: 'Заходы сохранены', description: 'Данные по настилам обновлены' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
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

  // Открыть диалог редактирования заходов для позиции
  const openPassesDialog = useCallback((item: any) => {
    const passes: CuttingPassItem[] = item.passes || []
    if (passes.length > 0) {
      setPassesEditData(passes.map((p) => ({
        passNumber: p.passNumber,
        layers: p.layers,
        actualQty: p.actualQty ?? p.layers,
        note: p.note || '',
      })))
    } else {
      // Если заходов нет — создаём один пустой
      setPassesEditData([{ passNumber: 1, layers: item.plannedQty, actualQty: item.plannedQty, note: '' }])
    }
    setPassesDialogItemId(item.id)
    setPassesDialogOpen(true)
  }, [])

  // Добавить заход
  const addPass = useCallback(() => {
    setPassesEditData((prev) => [
      ...prev,
      { passNumber: prev.length + 1, layers: 0, actualQty: 0, note: '' },
    ])
  }, [])

  // Удалить заход
  const removePass = useCallback((index: number) => {
    setPassesEditData((prev) =>
      prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, passNumber: i + 1 }))
    )
  }, [])

  // Обновить данные захода
  const updatePass = useCallback((index: number, field: keyof PassEdit, value: number | string) => {
    setPassesEditData((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    )
  }, [])

  // Сохранить заходы
  const handleSavePasses = useCallback(() => {
    savePassesMutation.mutate({ cuttingPlanItemId: passesDialogItemId, passes: passesEditData })
  }, [passesDialogItemId, passesEditData, savePassesMutation])

  // Итого по заходам для позиции
  const getPassesSummary = useCallback((item: any) => {
    const passes: CuttingPassItem[] = item.passes || []
    if (passes.length === 0) return null
    const totalLayers = passes.reduce((sum, p) => sum + p.layers, 0)
    const totalActual = passes.reduce((sum, p) => sum + (p.actualQty ?? p.layers), 0)
    return { passCount: passes.length, totalLayers, totalActual }
  }, [])

  // Переключить раскрытие строки
  const toggleExpand = useCallback((itemId: string) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }))
  }, [])

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
                        <TableHead className="w-8"></TableHead>
                        <TableHead>Изделие</TableHead>
                        <TableHead>Артикул</TableHead>
                        <TableHead>Размер</TableHead>
                        <TableHead>Цвет</TableHead>
                        <TableHead className="text-center">План</TableHead>
                        <TableHead className="text-center">Настилы</TableHead>
                        <TableHead className="text-center">Факт</TableHead>
                        <TableHead className="text-center">Остаток</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cp.items.map((item: any) => {
                        const currentActual = actualQtys[item.id] !== undefined ? actualQtys[item.id] : (item.actualQty ?? '')
                        const hasMismatch = item.actualQty !== null && item.actualQty !== item.plannedQty
                        const passes: CuttingPassItem[] = item.passes || []
                        const summary = getPassesSummary(item)
                        const isExpanded = expandedItems[item.id]
                        const hasPasses = passes.length > 0

                        return (
                          <TableRow key={item.id} className={hasMismatch ? 'bg-red-50' : ''}>
                            {/* Кнопка раскрытия */}
                            <TableCell className="px-1">
                              {hasPasses ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleExpand(item.id)}
                                >
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-muted-foreground"
                                  onClick={() => openPassesDialog(item)}
                                  title="Добавить заходы"
                                >
                                  <Layers className="h-3 w-3" />
                                </Button>
                              )}
                            </TableCell>
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
                            {/* Настилы — сводка + кнопка редактировать */}
                            <TableCell className="text-center">
                              {summary ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs px-2"
                                    onClick={() => openPassesDialog(item)}
                                  >
                                    <Layers className="h-3 w-3 mr-1" />
                                    {summary.passCount} пач.
                                  </Button>
                                  <span className="text-xs text-muted-foreground">
                                    ({summary.totalLayers} сл.)
                                  </span>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs px-2"
                                  onClick={() => openPassesDialog(item)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Добавить
                                </Button>
                              )}
                            </TableCell>
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

                {/* Раскрытые заходы под таблицей */}
                {cp.items.some((item: any) => expandedItems[item.id] && (item.passes || []).length > 0) && (
                  <div className="border-t bg-gray-50/50">
                    {cp.items.filter((item: any) => expandedItems[item.id] && (item.passes || []).length > 0).map((item: any) => {
                      const passes: CuttingPassItem[] = item.passes || []
                      return (
                        <div key={item.id} className="px-4 py-3 border-b last:border-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                              {item.product.name} — {item.size} — {item.color}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs px-2"
                              onClick={() => openPassesDialog(item)}
                            >
                              Редактировать
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                            {passes.map((p) => (
                              <div key={p.id} className="bg-white rounded-lg border p-2 text-sm">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-xs">Заход {p.passNumber}</span>
                                  <Badge variant="secondary" className="text-[10px] px-1">
                                    {p.layers} сл.
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Факт: <span className="font-medium text-foreground">{p.actualQty ?? p.layers} шт</span>
                                </div>
                                {p.note && (
                                  <div className="text-[10px] text-muted-foreground mt-1 truncate" title={p.note}>
                                    {p.note}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
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

      {/* ===== Диалог редактирования заходов ===== */}
      <Dialog open={passesDialogOpen} onOpenChange={setPassesDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-600" />
              Заходы раскроя (настилы)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <p className="text-xs text-muted-foreground">
              Каждый заход — это один настил (укладка слоёв ткани) и его раскрой. 
              Укажите количество слоёв для каждого захода.
            </p>
            {passesEditData.map((pass, index) => (
              <div key={index} className="bg-gray-50 rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Заход {pass.passNumber}</Label>
                  {passesEditData.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => removePass(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Слоёв настила</Label>
                    <Input
                      type="number"
                      min="1"
                      className="h-8 text-sm"
                      value={pass.layers}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0
                        updatePass(index, 'layers', val)
                        // Авто: факт = слоёв, если не меняли вручную
                        if (pass.actualQty === pass.layers || pass.actualQty === 0) {
                          updatePass(index, 'actualQty', val)
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Факт (шт)</Label>
                    <Input
                      type="number"
                      min="0"
                      className="h-8 text-sm"
                      value={pass.actualQty}
                      onChange={(e) => updatePass(index, 'actualQty', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Примечание</Label>
                  <Input
                    className="h-7 text-xs"
                    placeholder="необязательно"
                    value={pass.note}
                    onChange={(e) => updatePass(index, 'note', e.target.value)}
                  />
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={addPass}
            >
              <Plus className="h-4 w-4 mr-1" />
              Добавить заход
            </Button>
            {/* Сводка */}
            {passesEditData.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Итого:</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {passesEditData.length} пач.
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {passesEditData.reduce((s, p) => s + p.layers, 0)} сл.
                    </span>
                    <span className="font-semibold">
                      {passesEditData.reduce((s, p) => s + p.actualQty, 0)} шт
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPassesDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSavePasses}
              disabled={savePassesMutation.isPending}
            >
              {savePassesMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
