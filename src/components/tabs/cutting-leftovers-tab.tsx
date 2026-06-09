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
import { Loader2, Scissors, Pencil, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { authFetch, authFetchJson } from '@/components/auth-provider'
import type { CuttingLeftover } from '@/types'

export function CuttingLeftoversTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [filterCustomerId, setFilterCustomerId] = useState('')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingLeftover, setEditingLeftover] = useState<CuttingLeftover | null>(null)
  const [editSewnQty, setEditSewnQty] = useState('')
  const [editNote, setEditNote] = useState('')

  const { data: leftovers = [], isLoading } = useQuery({
    queryKey: ['cutting-leftovers', filterCustomerId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filterCustomerId) params.set('customerId', filterCustomerId)
      const data = await authFetchJson(`/api/cutting-leftovers?${params.toString()}`)
      return Array.isArray(data) ? data : []
    },
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const data = await authFetchJson('/api/customers')
      return Array.isArray(data) ? data : []
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      authFetchJson(`/api/cutting-leftovers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cutting-leftovers'] })
      setEditDialogOpen(false)
      toast({ title: 'Обновлено', description: 'Остаток кроя обновлён' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      authFetchJson(`/api/cutting-leftovers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cutting-leftovers'] })
      toast({ title: 'Удалено', description: 'Остаток кроя удалён' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  const openEdit = useCallback((lo: CuttingLeftover) => {
    setEditingLeftover(lo)
    setEditSewnQty(String(lo.sewnQty))
    setEditNote(lo.note || '')
    setEditDialogOpen(true)
  }, [])

  const handleSave = useCallback(() => {
    if (!editingLeftover) return
    updateMutation.mutate({
      id: editingLeftover.id,
      data: {
        sewnQty: parseInt(editSewnQty) || 0,
        note: editNote || null,
      },
    })
  }, [editingLeftover, editSewnQty, editNote, updateMutation])

  const getLeftoverStatusBadge = (status: string) => {
    switch (status) {
      case 'free': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Свободно</Badge>
      case 'partially_sewn': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Частично пошито</Badge>
      case 'fully_sewn': return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Полностью пошито</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Свободный крой (остатки)</h2>
        <div className="flex items-center gap-2">
          <Select value={filterCustomerId} onValueChange={(v) => setFilterCustomerId(v === '_all' ? '' : v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Все заказчики" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Все заказчики</SelectItem>
              {customers.map((c: { id: string; name: string }) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {leftovers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Scissors className="h-12 w-12 mb-3 opacity-30" />
            <p>Нет остатков кроя</p>
            <p className="text-xs mt-1">Остатки появляются автоматически при фактическом раскрое больше плана</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Заказчик</TableHead>
                  <TableHead>Изделие</TableHead>
                  <TableHead>Размер</TableHead>
                  <TableHead>Цвет</TableHead>
                  <TableHead className="text-center">Остаток</TableHead>
                  <TableHead className="text-center">Пошито</TableHead>
                  <TableHead className="text-center">Доступно</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Источник</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(leftovers as CuttingLeftover[]).map((lo) => {
                  const available = lo.quantity - lo.sewnQty
                  return (
                    <TableRow key={lo.id} className={available > 0 ? '' : 'opacity-60'}>
                      <TableCell className="text-sm">{lo.cuttingPlan?.plan?.customer?.name || '—'}</TableCell>
                      <TableCell className="font-medium">{lo.product.name}</TableCell>
                      <TableCell>{lo.size}</TableCell>
                      <TableCell>
                        <span className="flex items-center">
                          <span style={{ backgroundColor: lo.colorHex }} className="inline-block w-3 h-3 rounded-full mr-1.5 border border-gray-200" />
                          {lo.color}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-semibold">{lo.quantity}</TableCell>
                      <TableCell className="text-center">{lo.sewnQty}</TableCell>
                      <TableCell className="text-center">
                        <span className={`font-semibold ${available > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {available}
                        </span>
                      </TableCell>
                      <TableCell>{getLeftoverStatusBadge(lo.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{lo.source === 'cutting' ? 'Раскрой' : 'Вручную'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-emerald-600" onClick={() => openEdit(lo)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 text-red-500" onClick={() => deleteMutation.mutate(lo.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
      )}

      {/* Edit leftover dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Редактировать остаток</DialogTitle>
          </DialogHeader>
          {editingLeftover && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {editingLeftover.product.name} — {editingLeftover.size} — {editingLeftover.color}
              </div>
              <div className="space-y-2">
                <Label>Пошито из остатка</Label>
                <Input
                  type="number" min="0" max={editingLeftover.quantity}
                  value={editSewnQty}
                  onChange={(e) => setEditSewnQty(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Всего: {editingLeftover.quantity}, доступно: {editingLeftover.quantity - editingLeftover.sewnQty}</p>
              </div>
              <div className="space-y-2">
                <Label>Комментарий</Label>
                <Input
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Напр. зарисовка на пустом участке"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Отмена</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Сохранить
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
