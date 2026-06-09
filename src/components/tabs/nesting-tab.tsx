'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Separator } from '@/components/ui/separator'
import { Loader2, Plus, Trash2, Pencil, Layers, Play, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { authFetch, authFetchJson } from '@/components/auth-provider'

interface PatternInfo { id: string; name: string; size: string; product: { id: string; name: string; article: string } }
interface NestingItem { id: string; patternId: string; posX: number; posY: number; rotation: number; flipped: boolean; pattern: PatternInfo }
interface CuttingPlanInfo { id: string; label: string | null; plan?: { id: string; name: string } }
interface NestingLayout {
  id: string; name: string; cuttingPlanId: string | null
  fabricWidthMm: number; fabricLengthMm: number | null; totalAreaMm2: number | null
  utilization: number | null; svgPreview: string | null; status: string
  cuttingPlan: CuttingPlanInfo | null; items: NestingItem[]
  createdAt: string; updatedAt: string
}

export function NestingTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingLayout, setEditingLayout] = useState<NestingLayout | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailLayout, setDetailLayout] = useState<NestingLayout | null>(null)
  const [form, setForm] = useState({ name: '', cuttingPlanId: '', fabricWidthMm: '1500' })

  // Fetch layouts
  const { data: layouts = [], isLoading } = useQuery<NestingLayout[]>({
    queryKey: ['nesting-layouts'],
    queryFn: () => authFetchJson('/api/nesting-layouts'),
  })

  // Fetch patterns for adding items
  const { data: patterns = [] } = useQuery<PatternInfo[]>({
    queryKey: ['patterns-quick'],
    queryFn: () => authFetchJson('/api/patterns'),
  })

  // Fetch cutting plans for linking
  const { data: cuttingPlans = [] } = useQuery({
    queryKey: ['cutting-plans-quick'],
    queryFn: async () => {
      const plans = await authFetchJson('/api/plans')
      const allCuttingPlans: Array<{ id: string; label: string | null; planName: string; planId: string }> = []
      for (const plan of plans) {
        if (plan.cuttingPlans) {
          for (const cp of plan.cuttingPlans) {
            allCuttingPlans.push({ id: cp.id, label: cp.label, planName: plan.name, planId: plan.id })
          }
        }
      }
      return allCuttingPlans
    },
  })

  // Create
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => authFetchJson('/api/nesting-layouts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nesting-layouts'] })
      setCreateOpen(false)
      resetForm()
      toast({ title: 'Раскладка создана' })
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: (id: string) => authFetchJson(`/api/nesting-layouts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nesting-layouts'] })
      setDeleteId(null)
      toast({ title: 'Раскладка удалена' })
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  })

  // Confirm layout
  const confirmMutation = useMutation({
    mutationFn: (id: string) => authFetchJson(`/api/nesting-layouts/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'confirmed' }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nesting-layouts'] })
      toast({ title: 'Раскладка подтверждена' })
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  })

  // Simple auto-nesting algorithm
  const autoNestMutation = useMutation({
    mutationFn: async (layoutId: string) => {
      const layout = layouts.find(l => l.id === layoutId)
      if (!layout || layout.items.length === 0) throw new Error('No items')

      // Simple strip-packing: place items row by row
      const fabricWidth = layout.fabricWidthMm
      let currentX = 0
      let currentY = 0
      let rowHeight = 0
      const updatedItems = layout.items.map(item => {
        const pWidth = item.pattern.widthMm || 200
        const pHeight = item.pattern.heightMm || 300
        // Check if fits in current row
        if (currentX + pWidth > fabricWidth) {
          currentX = 0
          currentY += rowHeight
          rowHeight = 0
        }
        const result = { ...item, posX: currentX, posY: currentY }
        currentX += pWidth + 5 // 5mm gap
        rowHeight = Math.max(rowHeight, pHeight + 5)
        return result
      })

      const totalLength = currentY + rowHeight
      const totalArea = updatedItems.reduce((sum, item) => {
        return sum + (item.pattern.widthMm || 200) * (item.pattern.heightMm || 300)
      }, 0)
      const fabricArea = fabricWidth * totalLength
      const utilization = fabricArea > 0 ? Math.round((totalArea / fabricArea) * 1000) / 10 : 0

      return authFetchJson(`/api/nesting-layouts/${layoutId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'calculated',
          fabricLengthMm: totalLength,
          totalAreaMm2: totalArea,
          utilization,
          items: updatedItems.map(i => ({ patternId: i.patternId, posX: i.posX, posY: i.posY, rotation: i.rotation, flipped: i.flipped })),
        }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nesting-layouts'] })
      toast({ title: 'Раскладка рассчитана', description: 'Лекала размещены на ткани' })
    },
    onError: (err: Error) => toast({ title: 'Ошибка расчёта', description: err.message, variant: 'destructive' }),
  })

  const resetForm = useCallback(() => {
    setForm({ name: '', cuttingPlanId: '', fabricWidthMm: '1500' })
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Черновик</Badge>
      case 'calculated': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Рассчитана</Badge>
      case 'confirmed': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Подтверждена</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Раскладка</h2>
          <p className="text-muted-foreground mt-1">Автоматическая раскладка лекал на ткани для раскроя</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { resetForm(); setCreateOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Новая раскладка
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /><span className="ml-2 text-muted-foreground">Загрузка...</span></div>
          ) : layouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Layers className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-lg font-medium">Нет раскладок</p>
              <p className="text-sm mt-1">Создайте раскладку для автоматического размещения лекал на ткани</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Название</TableHead>
                  <TableHead>План раскроя</TableHead>
                  <TableHead className="text-center">Ширина ткани (мм)</TableHead>
                  <TableHead className="text-center">Длина ткани (мм)</TableHead>
                  <TableHead className="text-center">Лекал</TableHead>
                  <TableHead className="text-center">Использование</TableHead>
                  <TableHead className="text-center">Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {layouts.map(l => (
                  <TableRow key={l.id} className={l.status === 'confirmed' ? 'opacity-70' : ''}>
                    <TableCell className="font-medium text-sm">{l.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {l.cuttingPlan ? `${l.cuttingPlan.plan?.name || ''}${l.cuttingPlan.label ? ` / ${l.cuttingPlan.label}` : ''}` : '—'}
                    </TableCell>
                    <TableCell className="text-center text-sm">{l.fabricWidthMm}</TableCell>
                    <TableCell className="text-center text-sm">{l.fabricLengthMm ? Math.round(l.fabricLengthMm) : '—'}</TableCell>
                    <TableCell className="text-center text-sm">{l.items.length}</TableCell>
                    <TableCell className="text-center text-sm">{l.utilization != null ? `${l.utilization}%` : '—'}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(l.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setDetailLayout(l)} title="Подробнее">
                          <Layers className="h-4 w-4" />
                        </Button>
                        {l.status === 'draft' && l.items.length > 0 && (
                          <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => autoNestMutation.mutate(l.id)} disabled={autoNestMutation.isPending} title="Рассчитать раскладку">
                            {autoNestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                          </Button>
                        )}
                        {l.status === 'calculated' && (
                          <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => confirmMutation.mutate(l.id)} title="Подтвердить">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {l.status !== 'confirmed' && (
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteId(l.id)} title="Удалить">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Новая раскладка</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Название <span className="text-red-500">*</span></Label>
              <Input placeholder="Раскладка #1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>План раскроя (необязательно)</Label>
              <Select value={form.cuttingPlanId} onValueChange={v => setForm(f => ({ ...f, cuttingPlanId: v }))}>
                <SelectTrigger><SelectValue placeholder="Без привязки" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без привязки</SelectItem>
                  {cuttingPlans.map((cp: { id: string; label: string | null; planName: string }) => (
                    <SelectItem key={cp.id} value={cp.id}>{cp.planName}{cp.label ? ` / ${cp.label}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ширина ткани (мм)</Label>
              <Input type="number" value={form.fabricWidthMm} onChange={e => setForm(f => ({ ...f, fabricWidthMm: e.target.value }))} />
            </div>
            <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50/50 p-3 text-sm text-muted-foreground">
              После создания раскладки добавьте лекала и нажмите &laquo;Рассчитать&raquo; для автоматического размещения.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!form.name || createMutation.isPending}
              onClick={() => createMutation.mutate({
                name: form.name,
                cuttingPlanId: form.cuttingPlanId === 'none' ? null : form.cuttingPlanId || null,
                fabricWidthMm: parseFloat(form.fabricWidthMm) || 1500,
              })}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailLayout} onOpenChange={() => setDetailLayout(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Раскладка: {detailLayout?.name}</DialogTitle></DialogHeader>
          {detailLayout && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Ширина ткани:</span> <span className="font-medium">{detailLayout.fabricWidthMm} мм</span></div>
                <div><span className="text-muted-foreground">Длина ткани:</span> <span className="font-medium">{detailLayout.fabricLengthMm ? `${Math.round(detailLayout.fabricLengthMm)} мм` : '—'}</span></div>
                <div><span className="text-muted-foreground">Использование:</span> <span className="font-medium">{detailLayout.utilization != null ? `${detailLayout.utilization}%` : '—'}</span></div>
                <div><span className="text-muted-foreground">Статус:</span> {getStatusBadge(detailLayout.status)}</div>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold text-sm mb-2">Лекала в раскладке ({detailLayout.items.length})</h4>
                {detailLayout.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Лекала не добавлены</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Изделие</TableHead>
                        <TableHead>Лекало</TableHead>
                        <TableHead>Размер</TableHead>
                        <TableHead className="text-center">X (мм)</TableHead>
                        <TableHead className="text-center">Y (мм)</TableHead>
                        <TableHead className="text-center">Поворот</TableHead>
                        <TableHead className="text-center">Зеркально</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailLayout.items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">{item.pattern.product.name}</TableCell>
                          <TableCell className="text-sm font-medium">{item.pattern.name}</TableCell>
                          <TableCell className="text-sm">{item.pattern.size}</TableCell>
                          <TableCell className="text-center text-sm">{Math.round(item.posX)}</TableCell>
                          <TableCell className="text-center text-sm">{Math.round(item.posY)}</TableCell>
                          <TableCell className="text-center text-sm">{item.rotation}&deg;</TableCell>
                          <TableCell className="text-center text-sm">{item.flipped ? 'Да' : 'Нет'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
              <Separator />
              {/* Canvas preview */}
              {detailLayout.fabricLengthMm && detailLayout.items.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Превью раскладки</h4>
                  <NestingCanvas layout={detailLayout} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Удалить раскладку?</AlertDialogTitle><AlertDialogDescription>Это действие нельзя отменить.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Simple canvas preview component
function NestingCanvas({ layout }: { layout: NestingLayout }) {
  const canvasRef = useCallback((node: HTMLCanvasElement | null) => {
    if (!node || !layout.fabricLengthMm) return
    const ctx = node.getContext('2d')
    if (!ctx) return

    const scale = Math.min(600 / layout.fabricWidthMm, 400 / layout.fabricLengthMm)
    node.width = layout.fabricWidthMm * scale
    node.height = layout.fabricLengthMm * scale

    // Draw fabric area
    ctx.fillStyle = '#f9fafb'
    ctx.fillRect(0, 0, node.width, node.height)
    ctx.strokeStyle = '#d1d5db'
    ctx.strokeRect(0, 0, node.width, node.height)

    // Colors for different products
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

    // Draw patterns
    layout.items.forEach((item, idx) => {
      const w = (item.pattern.widthMm || 200) * scale
      const h = (item.pattern.heightMm || 300) * scale
      const x = item.posX * scale
      const y = item.posY * scale

      ctx.fillStyle = colors[idx % colors.length] + '30'
      ctx.strokeStyle = colors[idx % colors.length]
      ctx.lineWidth = 1.5
      ctx.fillRect(x, y, w, h)
      ctx.strokeRect(x, y, w, h)

      // Label
      ctx.fillStyle = colors[idx % colors.length]
      ctx.font = `${Math.max(9, Math.min(12, w / 6))}px sans-serif`
      ctx.fillText(item.pattern.name, x + 3, y + 12)
      ctx.font = `${Math.max(8, Math.min(10, w / 7))}px sans-serif`
      ctx.fillText(item.pattern.size, x + 3, y + 24)
    })
  }, [layout])

  return <canvas ref={canvasRef} className="border rounded-lg" />
}
