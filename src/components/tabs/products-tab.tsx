'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { authFetch, authFetchJson } from '@/components/auth-provider'
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'

import type { Product } from '@/types'
import { parseKitComboColors } from '@/lib/formatters'
import { getColorDot } from '@/lib/status-badges'
import { STANDARD_SIZE_GRIDS, STANDARD_COLORS } from '@/lib/constants'

// ============ TAB 5: ИЗДЕЛИЯ ============
export function ProductsTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [newName, setNewName] = useState('')
  const [newArticle, setNewArticle] = useState('')
  const [newSewerRate, setNewSewerRate] = useState('150')
  const [newHomeRate, setNewHomeRate] = useState('0')
  const [newQcRate, setNewQcRate] = useState('50')
  const [newReworkRate, setNewReworkRate] = useState('80')
  const [newIsKit, setNewIsKit] = useState(false)
  const [newKitComboColors, setNewKitComboColors] = useState<Record<string, string[]>>({})
  const [newKitKey, setNewKitKey] = useState('')
  const [newKitValue, setNewKitValue] = useState('')
  const [newSizes, setNewSizes] = useState<string[]>([])
  const [newSizeInput, setNewSizeInput] = useState('')
  const [newColors, setNewColors] = useState<Array<{ color: string; colorHex: string }>>([])
  const [newColorName, setNewColorName] = useState('')
  const [newColorHex, setNewColorHex] = useState('#9ca3af')
  const [newReworkReasons, setNewReworkReasons] = useState<string[]>([])
  const [newReasonInput, setNewReasonInput] = useState('')
  const [newIroningRate, setNewIroningRate] = useState('10')
  const [newCuttingRate, setNewCuttingRate] = useState('30')
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null)
  const [newImageFile, setNewImageFile] = useState<File | null>(null)
  const [editName, setEditName] = useState('')
  const [editArticle, setEditArticle] = useState('')
  const [editSewerRate, setEditSewerRate] = useState('150')
  const [editHomeRate, setEditHomeRate] = useState('0')
  const [editQcRate, setEditQcRate] = useState('50')
  const [editReworkRate, setEditReworkRate] = useState('80')
  const [editIsKit, setEditIsKit] = useState(false)
  const [editKitComboColors, setEditKitComboColors] = useState<Record<string, string[]>>({})
  const [editKitKey, setEditKitKey] = useState('')
  const [editKitValue, setEditKitValue] = useState('')
  const [editSizes, setEditSizes] = useState<string[]>([])
  const [editSizeInput, setEditSizeInput] = useState('')
  const [editColors, setEditColors] = useState<Array<{ color: string; colorHex: string }>>([])
  const [editColorName, setEditColorName] = useState('')
  const [editColorHex, setEditColorHex] = useState('#9ca3af')
  const [editReworkReasons, setEditReworkReasons] = useState<string[]>([])
  const [editReasonInput, setEditReasonInput] = useState('')
  const [editIroningRate, setEditIroningRate] = useState('10')
  const [editCuttingRate, setEditCuttingRate] = useState('30')
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null)
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [sizeRates, setSizeRates] = useState<Record<string, { sewerRate: string; homeRate: string; qcRate: string; ironingRate: string; cuttingRate: string }>>({})

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const r = await authFetch('/api/products')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      authFetchJson('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setCreateOpen(false); resetCreateForm(); toast({ title: 'Изделие создано' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      authFetchJson(`/api/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setEditOpen(false); setSelectedProduct(null); toast({ title: 'Изделие обновлено' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      authFetchJson(`/api/products/${id}`, { method: 'DELETE' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setDeleteOpen(false); setSelectedProduct(null); toast({ title: 'Изделие удалено' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })

  const resetCreateForm = useCallback(() => {
    setNewName(''); setNewArticle(''); setNewSewerRate('150'); setNewHomeRate('0'); setNewQcRate('50'); setNewReworkRate('80'); setNewIroningRate('10'); setNewCuttingRate('30'); setNewIsKit(false); setNewKitComboColors({}); setNewKitKey(''); setNewKitValue(''); setNewSizes([]); setNewSizeInput(''); setNewColors([]); setNewColorName(''); setNewColorHex('#9ca3af'); setNewReworkReasons([]); setNewReasonInput(''); setNewImageUrl(null); setNewImageFile(null)
  }, [])

  const handleCreate = useCallback(() => {
    if (!newName.trim() || !newArticle.trim()) { toast({ title: 'Ошибка', description: 'Заполните название и артикул', variant: 'destructive' }); return }
    createMutation.mutate({ name: newName, article: newArticle, sewerRate: parseInt(newSewerRate) || 150, homeRate: parseInt(newHomeRate) || 0, qcRate: parseInt(newQcRate) || 50, reworkRate: parseInt(newReworkRate) || 80, ironingRate: parseInt(newIroningRate) || 0, cuttingRate: parseInt(newCuttingRate) || 0, isKit: newIsKit, kitComboColors: newIsKit ? newKitComboColors : null, sizes: newSizes, colors: newColors, imageUrl: newImageUrl })
  }, [newName, newArticle, newSewerRate, newHomeRate, newQcRate, newReworkRate, newIroningRate, newCuttingRate, newIsKit, newKitComboColors, newSizes, newColors, newImageUrl, createMutation, toast])

  const handleOpenEdit = useCallback((product: Product) => {
    const parsedKitComboColors = parseKitComboColors(product.isKit ? product.kitComboColors : null)
    setSelectedProduct(product); setEditName(product.name); setEditArticle(product.article); setEditSewerRate(String(product.sewerRate)); setEditHomeRate(String(product.homeRate)); setEditQcRate(String(product.qcRate)); setEditReworkRate(String(product.reworkRate)); setEditIroningRate(String(product.ironingRate ?? 0)); setEditCuttingRate(String(product.cuttingRate ?? 0)); setEditIsKit(product.isKit); setEditKitComboColors(parsedKitComboColors); setEditKitKey(''); setEditKitValue(''); setEditSizes(product.sizes.map((s) => s.size)); setEditSizeInput(''); setEditColors(product.colors.map((c) => ({ color: c.color, colorHex: c.colorHex }))); setEditColorName(''); setEditColorHex('#9ca3af'); setEditReworkReasons(product.reworkReasons.map((r) => r.text)); setEditReasonInput(''); setEditImageUrl(product.imageUrl || null); setEditImageFile(null); setSizeRates({}); setEditOpen(true)
    // Load size rates
    authFetchJson<Array<{ size: string; sewerRate: number | null; homeRate: number | null; qcRate: number | null; ironingRate: number | null; cuttingRate: number | null }>>(`/api/product-size-rates?productId=${product.id}`).then((rates) => {
      const r: Record<string, { sewerRate: string; homeRate: string; qcRate: string; ironingRate: string; cuttingRate: string }> = {}
      rates.forEach(s => { r[s.size] = { sewerRate: String(s.sewerRate ?? ''), homeRate: String(s.homeRate ?? ''), qcRate: String(s.qcRate ?? ''), ironingRate: String(s.ironingRate ?? ''), cuttingRate: String(s.cuttingRate ?? '') } })
      setSizeRates(r)
    }).catch(() => {})
  }, [])

  const handleUpdate = useCallback(() => {
    if (!selectedProduct || !editName.trim() || !editArticle.trim()) { toast({ title: 'Ошибка', description: 'Заполните название и артикул', variant: 'destructive' }); return }
    updateMutation.mutate({ id: selectedProduct.id, data: { name: editName, article: editArticle, sewerRate: parseInt(editSewerRate) || 150, homeRate: parseInt(editHomeRate) || 0, qcRate: parseInt(editQcRate) || 50, reworkRate: parseInt(editReworkRate) || 80, ironingRate: parseInt(editIroningRate) || 0, cuttingRate: parseInt(editCuttingRate) || 0, isKit: editIsKit, kitComboColors: editIsKit ? editKitComboColors : null, sizes: editSizes, colors: editColors, imageUrl: editImageUrl } })
    // Save size rates
    const ratesToSave = Object.entries(sizeRates).filter(([, v]) => v.sewerRate !== '' || v.homeRate !== '' || v.qcRate !== '' || v.ironingRate !== '' || v.cuttingRate !== '').map(([size, v]) => ({
      productId: selectedProduct.id,
      size,
      sewerRate: v.sewerRate ? parseInt(v.sewerRate) : null,
      homeRate: v.homeRate ? parseInt(v.homeRate) : null,
      qcRate: v.qcRate ? parseInt(v.qcRate) : null,
      ironingRate: v.ironingRate ? parseInt(v.ironingRate) : null,
      cuttingRate: v.cuttingRate ? parseInt(v.cuttingRate) : null,
    }))
    if (ratesToSave.length > 0) {
      authFetch('/api/product-size-rates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rates: ratesToSave }) }).catch(() => {})
    }
  }, [selectedProduct, editName, editArticle, editSewerRate, editHomeRate, editQcRate, editReworkRate, editIroningRate, editCuttingRate, editIsKit, editKitComboColors, editSizes, editColors, editImageUrl, sizeRates, updateMutation, toast])

  if (isLoading) { return (<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /><span className="ml-2 text-muted-foreground">Загрузка...</span></div>) }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Изделия</h2>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { resetCreateForm(); setCreateOpen(true) }}><Plus className="h-4 w-4 mr-1" />Добавить изделие</Button>
      </div>
      {products.length === 0 ? (
        <Card className="border-dashed"><CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground"><Package className="h-12 w-12 mb-3 opacity-30" /><p>Нет изделий в справочнике</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product: Product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-10 w-10 rounded object-cover border" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center"><Camera className="h-4 w-4 text-gray-400" /></div>
                    )}
                    <div><CardTitle className="text-base">{product.name}</CardTitle><CardDescription className="text-xs">{product.article}</CardDescription></div>
                  </div>
                  {product.isKit && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">ч/б</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Швея:</span> {product.sewerRate} ₽</div>
                  <div><span className="text-muted-foreground">Дома:</span> {product.homeRate} ₽</div>
                  <div><span className="text-muted-foreground">ОТК:</span> {product.qcRate} ₽</div>
                  <div><span className="text-muted-foreground">Перед.:</span> {product.reworkRate} ₽</div>
                  <div><span className="text-muted-foreground">ВТО:</span> {product.ironingRate ?? 0} ₽</div>
                  <div><span className="text-muted-foreground">Крой:</span> {product.cuttingRate ?? 0} ₽</div>
                </div>
                {product.sizes.length > 0 && (<div className="flex flex-wrap gap-1">{product.sizes.map((s) => (<Badge key={s.id} variant="outline" className="text-xs">{s.size}</Badge>))}</div>)}
                {product.colors.length > 0 && (<div className="flex flex-wrap gap-1">{product.colors.map((c) => (<Badge key={c.id} variant="outline" className="text-xs">{getColorDot(c.colorHex)}{c.color}</Badge>))}</div>)}
                {product.reworkReasons.length > 0 && (<div className="text-xs text-muted-foreground">Переделки: {product.reworkReasons.map((r) => r.text).join(', ')}</div>)}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 min-h-[44px]" onClick={() => handleOpenEdit(product)}><Pencil className="h-4 w-4 mr-1" />Изменить</Button>
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[44px]" onClick={() => { setSelectedProduct(product); setDeleteOpen(true) }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Product Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Новое изделие</DialogTitle><DialogDescription>Заполните данные изделия</DialogDescription></DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Название</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Футболка" /></div>
                <div className="space-y-2"><Label>Артикул</Label><Input value={newArticle} onChange={(e) => setNewArticle(e.target.value)} placeholder="ФК-001" /></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-2"><Label>Швея, ₽</Label><Input type="number" min="0" value={newSewerRate} onChange={(e) => setNewSewerRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Дома, ₽</Label><Input type="number" min="0" value={newHomeRate} onChange={(e) => setNewHomeRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>ОТК, ₽</Label><Input type="number" min="0" value={newQcRate} onChange={(e) => setNewQcRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Переделка, ₽</Label><Input type="number" min="0" value={newReworkRate} onChange={(e) => setNewReworkRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>ВТО, ₽</Label><Input type="number" min="0" value={newIroningRate} onChange={(e) => setNewIroningRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Крой, ₽</Label><Input type="number" min="0" value={newCuttingRate} onChange={(e) => setNewCuttingRate(e.target.value)} /></div>
              </div>
              {/* Image upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Фото изделия</Label>
                <div className="flex items-center gap-3">
                  {newImageUrl ? (
                    <div className="relative">
                      <img src={newImageUrl} alt="preview" className="h-16 w-16 rounded object-cover border" />
                      <Button size="sm" variant="ghost" className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-white rounded-full border" onClick={() => { setNewImageUrl(null); setNewImageFile(null) }}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <label className="h-16 w-16 rounded border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-emerald-400 transition-colors">
                      <Camera className="h-5 w-5 text-gray-400" />
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setNewImageFile(file)
                        const fd = new FormData(); fd.append('file', file)
                        try { const res = await authFetch('/api/upload', { method: 'POST', body: fd }); const data = await res.json(); if (data.url) setNewImageUrl(data.url) } catch { toast({ title: 'Ошибка', description: 'Не удалось загрузить фото', variant: 'destructive' }) }
                      }} />
                    </label>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Checkbox id="newIsKit" checked={newIsKit} onCheckedChange={(c) => setNewIsKit(c === true)} /><Label htmlFor="newIsKit" className="cursor-pointer">Комплект</Label></div>
                {newIsKit && (
                  <div className="space-y-2 border rounded-lg p-3 bg-amber-50/50">
                    <p className="text-xs text-muted-foreground">Например: &quot;ч/б&quot; → [чёрный, белый]. Комбо-цвет разворачивается в плане раскроя.</p>
                    {Object.entries(newKitComboColors).map(([key, values]) => (
                      <div key={key} className="flex items-center gap-2 bg-white rounded-md px-3 py-1.5 border text-sm">
                        <span className="font-medium">{key}</span><span className="text-muted-foreground">→</span><span>[{values.join(', ')}]</span>
                        <Button size="sm" variant="ghost" className="text-red-500 ml-auto p-0 h-auto" onClick={() => setNewKitComboColors(prev => { const n = { ...prev }; delete n[key]; return n })}><X className="h-3 w-3" /></Button>
                      </div>
                    ))}
                    <div className="flex gap-2 items-end">
                      <div className="w-20"><Label className="text-xs text-muted-foreground">Код</Label><Input value={newKitKey} onChange={(e) => setNewKitKey(e.target.value)} placeholder="ч/б" /></div>
                      <div className="flex-1"><Label className="text-xs text-muted-foreground">Цвета (через запятую)</Label><Input value={newKitValue} onChange={(e) => setNewKitValue(e.target.value)} placeholder="чёрный, белый" onKeyDown={(e) => { if (e.key === 'Enter' && newKitKey.trim()) { setNewKitComboColors(prev => ({ ...prev, [newKitKey.trim()]: newKitValue.trim() ? newKitValue.split(',').map(v => v.trim()).filter(Boolean) : [] })); setNewKitKey(''); setNewKitValue('') } }} /></div>
                      <Button size="sm" variant="outline" onClick={() => { if (newKitKey.trim()) { setNewKitComboColors(prev => ({ ...prev, [newKitKey.trim()]: newKitValue.trim() ? newKitValue.split(',').map(v => v.trim()).filter(Boolean) : [] })); setNewKitKey(''); setNewKitValue('') } }}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-sm font-medium">Размеры</Label>
                  <Select onValueChange={(label) => { const grid = STANDARD_SIZE_GRIDS.find(g => g.label === label); if (grid) setNewSizes(grid.sizes) }}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Применить сетку..." /></SelectTrigger>
                    <SelectContent>
                      {STANDARD_SIZE_GRIDS.map(g => <SelectItem key={g.label} value={g.label}>{g.label} ({g.sizes.join(', ')})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {newSizes.length > 0 && (
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs h-7 ml-auto" onClick={() => setNewSizes([])}>
                      <Trash2 className="h-3 w-3 mr-1" />Удалить все
                    </Button>
                  )}
                </div>
                {newSizes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {newSizes.map((size, idx) => (
                      <div key={size + idx} className="flex items-center gap-0.5 rounded-md border border-emerald-200 bg-emerald-50 pr-1">
                        <div className="flex flex-col">
                          <button type="button" className={`p-0 leading-none ${idx === 0 ? 'text-gray-300 cursor-default' : 'text-emerald-500 hover:text-emerald-700'}`} onClick={() => setNewSizes(prev => { const n = [...prev]; if (idx > 0) { [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]] } return n })} disabled={idx === 0} title="Переместить вверх">
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button type="button" className={`p-0 leading-none ${idx === newSizes.length - 1 ? 'text-gray-300 cursor-default' : 'text-emerald-500 hover:text-emerald-700'}`} onClick={() => setNewSizes(prev => { const n = [...prev]; if (idx < n.length - 1) { [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]] } return n })} disabled={idx === newSizes.length - 1} title="Переместить вниз">
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-medium text-emerald-700 px-1">{size}</span>
                        <button type="button" className="inline-flex items-center justify-center rounded-sm p-0.5 hover:bg-red-100 hover:text-red-600 text-gray-400 transition-colors" title={`Удалить размер ${size}`} onClick={() => setNewSizes(prev => prev.filter((_, j) => j !== idx))}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Размеры не добавлены — выберите сетку или введите вручную</span>
                )}
                <div className="flex gap-2">
                  <Input value={newSizeInput} onChange={(e) => setNewSizeInput(e.target.value)} placeholder="Новый размер" className="w-36" onKeyDown={(e) => { if (e.key === 'Enter' && newSizeInput.trim()) { setNewSizes((prev) => [...prev, newSizeInput.trim()]); setNewSizeInput('') } }} />
                  <Button size="sm" variant="outline" onClick={() => { if (newSizeInput.trim()) { setNewSizes((prev) => [...prev, newSizeInput.trim()]); setNewSizeInput('') } }}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-sm font-medium">Цвета</Label>
                  {newColors.length > 0 && (
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs h-7 ml-auto" onClick={() => setNewColors([])}>
                      <Trash2 className="h-3 w-3 mr-1" />Удалить все
                    </Button>
                  )}
                </div>
                {/* Standard color presets */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Стандартные цвета — нажмите, чтобы добавить:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STANDARD_COLORS.map(sc => (
                      <button
                        key={sc.color}
                        type="button"
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border transition-colors ${newColors.find(c => c.color === sc.color) ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-gray-200 hover:border-emerald-300'}`}
                        onClick={() => { if (!newColors.find(c => c.color === sc.color)) { setNewColors(prev => [...prev, { color: sc.color, colorHex: sc.hex }]) } }}
                      >
                        <span className="inline-block w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: sc.hex }} />
                        {sc.color}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Current colors */}
                {newColors.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {newColors.map((c, i) => (
                      <div key={c.color + i} className="flex items-center gap-1 bg-emerald-50 rounded-md border border-emerald-200 py-1 px-2">
                        <span className="inline-block w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: c.colorHex }} />
                        <span className="text-sm font-medium text-emerald-700">{c.color}</span>
                        <button type="button" className="inline-flex items-center justify-center rounded-sm p-0.5 hover:bg-red-100 hover:text-red-600 text-gray-400 transition-colors" title={`Удалить цвет ${c.color}`} onClick={() => setNewColors(prev => prev.filter((_, j) => j !== i))}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Цвета не добавлены — выберите из списка или введите свой</span>
                )}
                {/* Custom color input */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1 max-w-[200px]"><Input value={newColorName} onChange={(e) => setNewColorName(e.target.value)} placeholder="Свой цвет" onKeyDown={(e) => { if (e.key === 'Enter' && newColorName.trim()) { setNewColors(prev => [...prev, { color: newColorName.trim(), colorHex: newColorHex }]); setNewColorName(''); setNewColorHex('#9ca3af') } }} /></div>
                  <div className="flex items-center gap-1"><input type="color" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)} className="w-7 h-8 rounded cursor-pointer border-0 p-0" /></div>
                  <Button size="sm" variant="outline" onClick={() => { if (newColorName.trim()) { setNewColors(prev => [...prev, { color: newColorName.trim(), colorHex: newColorHex }]); setNewColorName(''); setNewColorHex('#9ca3af') } }}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Причины переделок</Label>
                <div className="flex flex-wrap gap-1 mb-2">{newReworkReasons.map((r, i) => (<Badge key={i} variant="secondary" className="gap-1">{r}<X className="h-3 w-3 cursor-pointer" onClick={() => setNewReworkReasons((prev) => prev.filter((_, j) => j !== i))} /></Badge>))}</div>
                <div className="flex gap-2"><Input value={newReasonInput} onChange={(e) => setNewReasonInput(e.target.value)} placeholder="Кривой шов..." onKeyDown={(e) => { if (e.key === 'Enter' && newReasonInput.trim()) { setNewReworkReasons((prev) => [...prev, newReasonInput.trim()]); setNewReasonInput('') } }} /><Button size="sm" variant="outline" onClick={() => { if (newReasonInput.trim()) { setNewReworkReasons((prev) => [...prev, newReasonInput.trim()]); setNewReasonInput('') } }}><Plus className="h-4 w-4" /></Button></div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader><DialogTitle>Редактировать изделие</DialogTitle><DialogDescription>Измените данные изделия</DialogDescription></DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Название</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Артикул</Label><Input value={editArticle} onChange={(e) => setEditArticle(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-2"><Label>Швея, ₽</Label><Input type="number" min="0" value={editSewerRate} onChange={(e) => setEditSewerRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Дома, ₽</Label><Input type="number" min="0" value={editHomeRate} onChange={(e) => setEditHomeRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>ОТК, ₽</Label><Input type="number" min="0" value={editQcRate} onChange={(e) => setEditQcRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Переделка, ₽</Label><Input type="number" min="0" value={editReworkRate} onChange={(e) => setEditReworkRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>ВТО, ₽</Label><Input type="number" min="0" value={editIroningRate} onChange={(e) => setEditIroningRate(e.target.value)} /></div>
                <div className="space-y-2"><Label>Крой, ₽</Label><Input type="number" min="0" value={editCuttingRate} onChange={(e) => setEditCuttingRate(e.target.value)} /></div>
              </div>
              {/* Image upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Фото изделия</Label>
                <div className="flex items-center gap-3">
                  {editImageUrl ? (
                    <div className="relative">
                      <img src={editImageUrl} alt="preview" className="h-16 w-16 rounded object-cover border" />
                      <Button size="sm" variant="ghost" className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-white rounded-full border" onClick={() => { setEditImageUrl(null); setEditImageFile(null) }}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <label className="h-16 w-16 rounded border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-emerald-400 transition-colors">
                      <Camera className="h-5 w-5 text-gray-400" />
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setEditImageFile(file)
                        const fd = new FormData(); fd.append('file', file)
                        try { const res = await authFetch('/api/upload', { method: 'POST', body: fd }); const data = await res.json(); if (data.url) setEditImageUrl(data.url) } catch { toast({ title: 'Ошибка', description: 'Не удалось загрузить фото', variant: 'destructive' }) }
                      }} />
                    </label>
                  )}
                </div>
              </div>
              {/* Size rates */}
              {editSizes.length > 0 && selectedProduct && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Нормы по размерам</Label>
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs h-8">Размер</TableHead>
                          <TableHead className="text-xs h-8">Швея</TableHead>
                          <TableHead className="text-xs h-8">Дома</TableHead>
                          <TableHead className="text-xs h-8">ОТК</TableHead>
                          <TableHead className="text-xs h-8">ВТО</TableHead>
                          <TableHead className="text-xs h-8">Крой</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editSizes.map((size) => {
                          const sr = sizeRates[size] || { sewerRate: '', homeRate: '', qcRate: '', ironingRate: '', cuttingRate: '' }
                          const isOverridden = sr.sewerRate !== '' || sr.homeRate !== '' || sr.qcRate !== '' || sr.ironingRate !== '' || sr.cuttingRate !== ''
                          return (
                            <TableRow key={size} className={isOverridden ? 'bg-emerald-50' : ''}>
                              <TableCell className="text-xs font-medium">{size}</TableCell>
                              <TableCell className="p-1"><Input type="number" min="0" className="h-7 text-xs" placeholder={`(${editSewerRate})`} value={sr.sewerRate} onChange={(e) => setSizeRates(prev => ({ ...prev, [size]: { ...prev[size] || { sewerRate: '', homeRate: '', qcRate: '', ironingRate: '', cuttingRate: '' }, sewerRate: e.target.value } }))} /></TableCell>
                              <TableCell className="p-1"><Input type="number" min="0" className="h-7 text-xs" placeholder={`(${editHomeRate})`} value={sr.homeRate} onChange={(e) => setSizeRates(prev => ({ ...prev, [size]: { ...prev[size] || { sewerRate: '', homeRate: '', qcRate: '', ironingRate: '', cuttingRate: '' }, homeRate: e.target.value } }))} /></TableCell>
                              <TableCell className="p-1"><Input type="number" min="0" className="h-7 text-xs" placeholder={`(${editQcRate})`} value={sr.qcRate} onChange={(e) => setSizeRates(prev => ({ ...prev, [size]: { ...prev[size] || { sewerRate: '', homeRate: '', qcRate: '', ironingRate: '', cuttingRate: '' }, qcRate: e.target.value } }))} /></TableCell>
                              <TableCell className="p-1"><Input type="number" min="0" className="h-7 text-xs" placeholder={`(${editIroningRate})`} value={sr.ironingRate} onChange={(e) => setSizeRates(prev => ({ ...prev, [size]: { ...prev[size] || { sewerRate: '', homeRate: '', qcRate: '', ironingRate: '', cuttingRate: '' }, ironingRate: e.target.value } }))} /></TableCell>
                              <TableCell className="p-1"><Input type="number" min="0" className="h-7 text-xs" placeholder={`(${editCuttingRate})`} value={sr.cuttingRate} onChange={(e) => setSizeRates(prev => ({ ...prev, [size]: { ...prev[size] || { sewerRate: '', homeRate: '', qcRate: '', ironingRate: '', cuttingRate: '' }, cuttingRate: e.target.value } }))} /></TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-muted-foreground">Пустое поле = базовая ставка изделия. Заполненное = переопределение для размера.</p>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Checkbox id="editIsKit" checked={editIsKit} onCheckedChange={(c) => setEditIsKit(c === true)} /><Label htmlFor="editIsKit" className="cursor-pointer">Комплект</Label></div>
                {editIsKit && (
                  <div className="space-y-2 border rounded-lg p-3 bg-amber-50/50">
                    <p className="text-xs text-muted-foreground">Например: &quot;ч/б&quot; → [чёрный, белый]. Комбо-цвет разворачивается в плане раскроя.</p>
                    {Object.entries(editKitComboColors).map(([key, values]) => (
                      <div key={key} className="flex items-center gap-2 bg-white rounded-md px-3 py-1.5 border text-sm">
                        <span className="font-medium">{key}</span><span className="text-muted-foreground">→</span><span>[{values.join(', ')}]</span>
                        <Button size="sm" variant="ghost" className="text-red-500 ml-auto p-0 h-auto" onClick={() => setEditKitComboColors(prev => { const n = { ...prev }; delete n[key]; return n })}><X className="h-3 w-3" /></Button>
                      </div>
                    ))}
                    <div className="flex gap-2 items-end">
                      <div className="w-20"><Label className="text-xs text-muted-foreground">Код</Label><Input value={editKitKey} onChange={(e) => setEditKitKey(e.target.value)} placeholder="ч/б" /></div>
                      <div className="flex-1"><Label className="text-xs text-muted-foreground">Цвета (через запятую)</Label><Input value={editKitValue} onChange={(e) => setEditKitValue(e.target.value)} placeholder="чёрный, белый" onKeyDown={(e) => { if (e.key === 'Enter' && editKitKey.trim()) { setEditKitComboColors(prev => ({ ...prev, [editKitKey.trim()]: editKitValue.trim() ? editKitValue.split(',').map(v => v.trim()).filter(Boolean) : [] })); setEditKitKey(''); setEditKitValue('') } }} /></div>
                      <Button size="sm" variant="outline" onClick={() => { if (editKitKey.trim()) { setEditKitComboColors(prev => ({ ...prev, [editKitKey.trim()]: editKitValue.trim() ? editKitValue.split(',').map(v => v.trim()).filter(Boolean) : [] })); setEditKitKey(''); setEditKitValue('') } }}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-sm font-medium">Размеры</Label>
                  <Select onValueChange={(label) => { const grid = STANDARD_SIZE_GRIDS.find(g => g.label === label); if (grid) setEditSizes(grid.sizes) }}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Применить сетку..." /></SelectTrigger>
                    <SelectContent>
                      {STANDARD_SIZE_GRIDS.map(g => <SelectItem key={g.label} value={g.label}>{g.label} ({g.sizes.join(', ')})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {editSizes.length > 0 && (
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs h-7 ml-auto" onClick={() => setEditSizes([])}>
                      <Trash2 className="h-3 w-3 mr-1" />Удалить все
                    </Button>
                  )}
                </div>
                {editSizes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {editSizes.map((size, idx) => (
                      <div key={size + idx} className="flex items-center gap-0.5 rounded-md border border-emerald-200 bg-emerald-50 pr-1">
                        <div className="flex flex-col">
                          <button type="button" className={`p-0 leading-none ${idx === 0 ? 'text-gray-300 cursor-default' : 'text-emerald-500 hover:text-emerald-700'}`} onClick={() => setEditSizes(prev => { const n = [...prev]; if (idx > 0) { [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]] } return n })} disabled={idx === 0} title="Переместить вверх">
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button type="button" className={`p-0 leading-none ${idx === editSizes.length - 1 ? 'text-gray-300 cursor-default' : 'text-emerald-500 hover:text-emerald-700'}`} onClick={() => setEditSizes(prev => { const n = [...prev]; if (idx < n.length - 1) { [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]] } return n })} disabled={idx === editSizes.length - 1} title="Переместить вниз">
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-medium text-emerald-700 px-1">{size}</span>
                        <button type="button" className="inline-flex items-center justify-center rounded-sm p-0.5 hover:bg-red-100 hover:text-red-600 text-gray-400 transition-colors" title={`Удалить размер ${size}`} onClick={() => setEditSizes(prev => prev.filter((_, j) => j !== idx))}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Размеры не добавлены — выберите сетку или введите вручную</span>
                )}
                <div className="flex gap-2">
                  <Input value={editSizeInput} onChange={(e) => setEditSizeInput(e.target.value)} placeholder="Новый размер" className="w-36" onKeyDown={(e) => { if (e.key === 'Enter' && editSizeInput.trim()) { setEditSizes((prev) => [...prev, editSizeInput.trim()]); setEditSizeInput('') } }} />
                  <Button size="sm" variant="outline" onClick={() => { if (editSizeInput.trim()) { setEditSizes((prev) => [...prev, editSizeInput.trim()]); setEditSizeInput('') } }}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-sm font-medium">Цвета</Label>
                  {editColors.length > 0 && (
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs h-7 ml-auto" onClick={() => setEditColors([])}>
                      <Trash2 className="h-3 w-3 mr-1" />Удалить все
                    </Button>
                  )}
                </div>
                {/* Standard color presets */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Стандартные цвета — нажмите, чтобы добавить:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STANDARD_COLORS.map(sc => (
                      <button
                        key={sc.color}
                        type="button"
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border transition-colors ${editColors.find(c => c.color === sc.color) ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-gray-200 hover:border-emerald-300'}`}
                        onClick={() => { if (!editColors.find(c => c.color === sc.color)) { setEditColors(prev => [...prev, { color: sc.color, colorHex: sc.hex }]) } }}
                      >
                        <span className="inline-block w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: sc.hex }} />
                        {sc.color}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Current colors */}
                {editColors.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {editColors.map((c, i) => (
                      <div key={c.color + i} className="flex items-center gap-1 bg-emerald-50 rounded-md border border-emerald-200 py-1 px-2">
                        <span className="inline-block w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: c.colorHex }} />
                        <span className="text-sm font-medium text-emerald-700">{c.color}</span>
                        <button type="button" className="inline-flex items-center justify-center rounded-sm p-0.5 hover:bg-red-100 hover:text-red-600 text-gray-400 transition-colors" title={`Удалить цвет ${c.color}`} onClick={() => setEditColors(prev => prev.filter((_, j) => j !== i))}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Цвета не добавлены — выберите из списка или введите свой</span>
                )}
                {/* Custom color input */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1 max-w-[200px]"><Input value={editColorName} onChange={(e) => setEditColorName(e.target.value)} placeholder="Свой цвет" onKeyDown={(e) => { if (e.key === 'Enter' && editColorName.trim()) { setEditColors(prev => [...prev, { color: editColorName.trim(), colorHex: editColorHex }]); setEditColorName(''); setEditColorHex('#9ca3af') } }} /></div>
                  <div className="flex items-center gap-1"><input type="color" value={editColorHex} onChange={(e) => setEditColorHex(e.target.value)} className="w-7 h-8 rounded cursor-pointer border-0 p-0" /></div>
                  <Button size="sm" variant="outline" onClick={() => { if (editColorName.trim()) { setEditColors(prev => [...prev, { color: editColorName.trim(), colorHex: editColorHex }]); setEditColorName(''); setEditColorHex('#9ca3af') } }}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Причины переделок</Label>
                <div className="flex flex-wrap gap-1 mb-2">{editReworkReasons.map((r, i) => (<Badge key={i} variant="secondary" className="gap-1">{r}<X className="h-3 w-3 cursor-pointer" onClick={() => setEditReworkReasons((prev) => prev.filter((_, j) => j !== i))} /></Badge>))}</div>
                <div className="flex gap-2"><Input value={editReasonInput} onChange={(e) => setEditReasonInput(e.target.value)} placeholder="Кривой шов..." onKeyDown={(e) => { if (e.key === 'Enter' && editReasonInput.trim()) { setEditReworkReasons((prev) => [...prev, editReasonInput.trim()]); setEditReasonInput('') } }} /><Button size="sm" variant="outline" onClick={() => { if (editReasonInput.trim()) { setEditReworkReasons((prev) => [...prev, editReasonInput.trim()]); setEditReasonInput('') } }}><Plus className="h-4 w-4" /></Button></div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleUpdate} disabled={updateMutation.isPending}>{updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Удалить изделие?</AlertDialogTitle><AlertDialogDescription>Это действие нельзя отменить. Изделие &laquo;{selectedProduct?.name}&raquo; будет удалено навсегда.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => selectedProduct && deleteMutation.mutate(selectedProduct.id)}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
