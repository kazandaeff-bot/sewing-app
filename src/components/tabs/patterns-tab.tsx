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
import { Loader2, Plus, Trash2, Pencil, Ruler, Upload, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { authFetch, authFetchJson } from '@/components/auth-provider'

interface PatternProduct { id: string; name: string; article: string }
interface Pattern {
  id: string; productId: string; name: string; size: string
  imageUrl: string | null; svgData: string | null; points: string | null
  widthMm: number | null; heightMm: number | null; areaMm2: number | null
  seamAllowance: number | null; grainAngle: number | null
  status: string; product: PatternProduct
  createdAt: string; updatedAt: string
}

export function PatternsTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [filterProduct, setFilterProduct] = useState<string>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingPattern, setEditingPattern] = useState<Pattern | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({ productId: '', name: '', size: '', widthMm: '', heightMm: '', seamAllowance: '10', grainAngle: '0' })

  // Fetch patterns
  const { data: patterns = [], isLoading } = useQuery<Pattern[]>({
    queryKey: ['patterns'],
    queryFn: () => authFetchJson('/api/patterns'),
  })

  // Fetch products for dropdown
  const { data: products = [] } = useQuery<PatternProduct[]>({
    queryKey: ['products-quick'],
    queryFn: () => authFetchJson('/api/products'),
  })

  const filtered = filterProduct === 'all' ? patterns : patterns.filter(p => p.productId === filterProduct)

  // Create
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => authFetchJson('/api/patterns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] })
      setCreateOpen(false)
      resetForm()
      toast({ title: 'Лекало создано' })
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  })

  // Update
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown> & { id: string }) => authFetchJson(`/api/patterns/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] })
      setEditOpen(false)
      setEditingPattern(null)
      resetForm()
      toast({ title: 'Лекало обновлено' })
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  })

  // Delete
  const deleteMutation = useMutation({
    mutationFn: (id: string) => authFetchJson(`/api/patterns/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] })
      setDeleteId(null)
      toast({ title: 'Лекало удалено' })
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  })

  // Mark as verified
  const verifyMutation = useMutation({
    mutationFn: (id: string) => authFetchJson(`/api/patterns/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'verified' }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] })
      toast({ title: 'Лекало верифицировано' })
    },
    onError: (err: Error) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  })

  const resetForm = useCallback(() => {
    setForm({ productId: '', name: '', size: '', widthMm: '', heightMm: '', seamAllowance: '10', grainAngle: '0' })
  }, [])

  const openEdit = (p: Pattern) => {
    setEditingPattern(p)
    setForm({
      productId: p.productId, name: p.name, size: p.size,
      widthMm: p.widthMm?.toString() || '', heightMm: p.heightMm?.toString() || '',
      seamAllowance: p.seamAllowance?.toString() || '10', grainAngle: p.grainAngle?.toString() || '0',
    })
    setEditOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Черновик</Badge>
      case 'digitized': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Оцифровано</Badge>
      case 'verified': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Проверено</Badge>
      default: return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Лекала</h2>
          <p className="text-muted-foreground mt-1">Оцифровка и управление лекалами изделий</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { resetForm(); setCreateOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Добавить лекало
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-4">
            <Label className="text-sm text-muted-foreground shrink-0">Изделие:</Label>
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger className="w-[250px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все изделия</SelectItem>
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.article})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /><span className="ml-2 text-muted-foreground">Загрузка...</span></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Ruler className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-lg font-medium">Нет лекал</p>
              <p className="text-sm mt-1">Добавьте лекало, нажав кнопку выше</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Изделие</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Размер</TableHead>
                  <TableHead className="text-center">Ширина (мм)</TableHead>
                  <TableHead className="text-center">Высота (мм)</TableHead>
                  <TableHead className="text-center">Припуск (мм)</TableHead>
                  <TableHead className="text-center">Статус</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{p.product.name} <span className="text-muted-foreground">({p.product.article})</span></TableCell>
                    <TableCell className="font-medium text-sm">{p.name}</TableCell>
                    <TableCell className="text-sm">{p.size}</TableCell>
                    <TableCell className="text-center text-sm">{p.widthMm ?? '—'}</TableCell>
                    <TableCell className="text-center text-sm">{p.heightMm ?? '—'}</TableCell>
                    <TableCell className="text-center text-sm">{p.seamAllowance ?? 10}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(p.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.status !== 'verified' && (
                          <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => verifyMutation.mutate(p.id)} title="Верифицировать">
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(p)} title="Редактировать">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteId(p.id)} title="Удалить">
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
          <DialogHeader><DialogTitle>Новое лекало</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Изделие <span className="text-red-500">*</span></Label>
              <Select value={form.productId} onValueChange={v => setForm(f => ({ ...f, productId: v }))}>
                <SelectTrigger><SelectValue placeholder="Выберите изделие" /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.article})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Название <span className="text-red-500">*</span></Label>
                <Input placeholder="Спинка, Полочка..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Размер <span className="text-red-500">*</span></Label>
                <Input placeholder="S, M, L, 46..." value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Ширина (мм)</Label>
                <Input type="number" placeholder="300" value={form.widthMm} onChange={e => setForm(f => ({ ...f, widthMm: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Высота (мм)</Label>
                <Input type="number" placeholder="500" value={form.heightMm} onChange={e => setForm(f => ({ ...f, heightMm: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Припуск на шов (мм)</Label>
                <Input type="number" value={form.seamAllowance} onChange={e => setForm(f => ({ ...f, seamAllowance: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Угол долевой нити (&deg;)</Label>
                <Input type="number" value={form.grainAngle} onChange={e => setForm(f => ({ ...f, grainAngle: e.target.value }))} />
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-blue-300 bg-blue-50/50 p-3 text-sm text-muted-foreground">
              <Upload className="h-4 w-4 inline mr-1" />
              Загрузка сканов и оцифровка контуров доступна после создания лекала через редактирование.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!form.productId || !form.name || !form.size || createMutation.isPending}
              onClick={() => createMutation.mutate({
                productId: form.productId, name: form.name, size: form.size,
                widthMm: form.widthMm ? parseFloat(form.widthMm) : null,
                heightMm: form.heightMm ? parseFloat(form.heightMm) : null,
                seamAllowance: parseFloat(form.seamAllowance) || 10,
                grainAngle: parseFloat(form.grainAngle) || 0,
              })}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Редактирование лекала</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Изделие</Label>
              <Select value={form.productId} onValueChange={v => setForm(f => ({ ...f, productId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.article})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Размер</Label>
                <Input value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Ширина (мм)</Label><Input type="number" value={form.widthMm} onChange={e => setForm(f => ({ ...f, widthMm: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Высота (мм)</Label><Input type="number" value={form.heightMm} onChange={e => setForm(f => ({ ...f, heightMm: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Припуск на шов (мм)</Label><Input type="number" value={form.seamAllowance} onChange={e => setForm(f => ({ ...f, seamAllowance: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Угол долевой нити (&deg;)</Label><Input type="number" value={form.grainAngle} onChange={e => setForm(f => ({ ...f, grainAngle: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={updateMutation.isPending}
              onClick={() => { if (!editingPattern) return; updateMutation.mutate({
                id: editingPattern.id, productId: form.productId, name: form.name, size: form.size,
                widthMm: form.widthMm ? parseFloat(form.widthMm) : null,
                heightMm: form.heightMm ? parseFloat(form.heightMm) : null,
                seamAllowance: parseFloat(form.seamAllowance) || 10,
                grainAngle: parseFloat(form.grainAngle) || 0,
              }) }}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Удалить лекало?</AlertDialogTitle><AlertDialogDescription>Это действие нельзя отменить.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
