'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Loader2,
  Plus,
  Trash2,
  X,
  Pencil,
  Users,
  MapPin,
  Package,
  ClipboardList,
  Grid3X3,
  ChevronUp,
  ChevronDown,
  ArrowDownCircle,
  ArrowUpCircle,
  History,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { authFetch } from '@/components/auth-provider'
import type { Product, Employee, EmployeeWithAuth, CustomerEditData, MaterialType } from '@/types'
import { getKitLabel, parseKitComboColors } from '@/lib/formatters'
import { EMPLOYEE_ROLES, STANDARD_SIZE_GRIDS, STANDARD_COLORS } from '@/lib/constants'

// ============ Standard Size Grids & Colors (frontend constants) ============
// Constants moved to @/lib/constants.ts — EMPLOYEE_ROLES, STANDARD_SIZE_GRIDS, STANDARD_COLORS
// Type EmployeeWithAuth moved to @/types/index.ts

export function ReferencesTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ---- Products state ----
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState({
    name: '', article: '', sewerRate: 150, homeRate: 0, qcRate: 50, reworkRate: 80,
    ironingRate: 10, cuttingRate: 30,
    isKit: false, kitComboColors: {} as Record<string, string[]>,
  })
  const [productSizes, setProductSizes] = useState<string[]>([])
  const [productColors, setProductColors] = useState<Array<{ color: string; colorHex: string }>>([])
  const [newSize, setNewSize] = useState('')
  const [newColor, setNewColor] = useState('')
  const [newColorHex, setNewColorHex] = useState('#9ca3af')
  const [newKitKey, setNewKitKey] = useState('')
  const [newKitValue, setNewKitValue] = useState('')

  // ---- Employees state ----
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithAuth | null>(null)
  const [employeeForm, setEmployeeForm] = useState({ name: '', code: '', username: '', password: '', role: 'sewer' })

  // ---- Cities state ----
  const [newCity, setNewCity] = useState('')

  // ---- Box types state ----
  const [newBoxName, setNewBoxName] = useState('')
  const [newBoxDimensions, setNewBoxDimensions] = useState('')
  const [newCapacities, setNewCapacities] = useState<Array<{ productId: string; size: string; maxQty: number }>>([])
  const [boxDialogOpen, setBoxDialogOpen] = useState(false)

  // ---- Customers state ----
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<{ id: string; name: string; type: 'organization' | 'ip' | 'individual'; inn: string; kpp: string; legalAddress: string; postalAddress: string; phone: string; email: string; bankName: string; bik: string; checkingAccount: string; corrAccount: string; bankCity: string; contactInfo: string; showMaterialBalance: boolean } | null>(null)
  const [customerForm, setCustomerForm] = useState({ name: '', type: 'organization' as 'organization' | 'ip' | 'individual', inn: '', kpp: '', legalAddress: '', postalAddress: '', phone: '', email: '', bankName: '', bik: '', checkingAccount: '', corrAccount: '', bankCity: '', contactInfo: '', showMaterialBalance: false })

  // ---- Material types state ----
  const [newMaterialTypeName, setNewMaterialTypeName] = useState('')
  const [newMaterialTypeCategory, setNewMaterialTypeCategory] = useState<'fabric' | 'furniture'>('fabric')
  const [expandedMaterialTypeIds, setExpandedMaterialTypeIds] = useState<Set<string>>(new Set())
  const [newMaterialName, setNewMaterialName] = useState('')
  const [newMaterialBaseUnit, setNewMaterialBaseUnit] = useState('пм')
  const [newMaterialInputUnit, setNewMaterialInputUnit] = useState('пм')
  const [newMaterialConversionRate, setNewMaterialConversionRate] = useState('1')
  const [addingMaterialToTypeId, setAddingMaterialToTypeId] = useState<string | null>(null)
  const [newMaterialOwnership, setNewMaterialOwnership] = useState<'own' | 'customer'>('own')
  const [newMaterialCustomerId, setNewMaterialCustomerId] = useState('')
  const [newMaterialInputQty, setNewMaterialInputQty] = useState('')

  // ---- Material norms state ----
  const [newNormProductId, setNewNormProductId] = useState('')
  const [newNormMaterialId, setNewNormMaterialId] = useState('')
  // ---- Material entries state ----
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [entryMaterialId, setEntryMaterialId] = useState('')
  const [entryType, setEntryType] = useState<'incoming' | 'consumed'>('incoming')
  const [entryInputQty, setEntryInputQty] = useState('')
  const [entryInputUnit, setEntryInputUnit] = useState('')
  const [entryConversionRate, setEntryConversionRate] = useState('1')
  const [entryNote, setEntryNote] = useState('')
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [historyMaterialId, setHistoryMaterialId] = useState('')
  const [newNormConsumption, setNewNormConsumption] = useState('')
  const [newNormUnit, setNewNormUnit] = useState('гр')

  // ---- Queries ----
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const r = await authFetch('/api/products')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const r = await authFetch('/api/employees')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })
  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const r = await authFetch('/api/cities')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })
  const { data: boxTypes = [], isLoading: boxTypesLoading } = useQuery({
    queryKey: ['box-types'],
    queryFn: async () => {
      const r = await authFetch('/api/box-types')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const r = await authFetch(`/api/customers?_t=${Date.now()}`)
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })
  const { data: materialTypes = [], isLoading: materialTypesLoading } = useQuery({
    queryKey: ['material-types'],
    queryFn: async () => {
      const r = await authFetch(`/api/material-types?_t=${Date.now()}`)
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })
  const { data: materialNorms = [], isLoading: materialNormsLoading } = useQuery({
    queryKey: ['material-norms'],
    queryFn: async () => {
      const r = await authFetch(`/api/material-norms?_t=${Date.now()}`)
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  // ---- Product mutations ----
  const createProductMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => authFetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); closeProductDialog(); toast({ title: 'Изделие создано' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => authFetch(`/api/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); closeProductDialog(); toast({ title: 'Изделие обновлено' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => authFetch(`/api/products/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); toast({ title: 'Изделие удалено' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить изделие', variant: 'destructive' }) },
  })

  // ---- Employee mutations ----
  const createEmployeeMutation = useMutation({
    mutationFn: (data: Record<string, string>) => authFetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); closeEmployeeDialog(); toast({ title: 'Сотрудник добавлен' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, string> }) => authFetch(`/api/employees/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); closeEmployeeDialog(); toast({ title: 'Сотрудник обновлён' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const deleteEmployeeMutation = useMutation({
    mutationFn: (id: string) => authFetch(`/api/employees/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); toast({ title: 'Сотрудник удалён' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить сотрудника', variant: 'destructive' }) },
  })

  // ---- City mutations ----
  const createCityMutation = useMutation({
    mutationFn: (name: string) => authFetch('/api/cities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cities'] }); setNewCity(''); toast({ title: 'Город добавлен' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось добавить город', variant: 'destructive' }) },
  })
  const deleteCityMutation = useMutation({
    mutationFn: (id: string) => authFetch(`/api/cities/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['cities'] }); toast({ title: 'Город удалён' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить город', variant: 'destructive' }) },
  })

  // ---- Box type mutations ----
  const createBoxTypeMutation = useMutation({
    mutationFn: (data: { name: string; dimensions?: string; capacities?: Array<{ productId: string; size: string; maxQty: number }> }) =>
      authFetch('/api/box-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['box-types'] }); setBoxDialogOpen(false); setNewBoxName(''); setNewBoxDimensions(''); setNewCapacities([]); toast({ title: 'Тип короба добавлен' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось добавить тип короба', variant: 'destructive' }) },
  })
  const deleteBoxTypeMutation = useMutation({
    mutationFn: (id: string) => authFetch(`/api/box-types/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['box-types'] }); toast({ title: 'Тип короба удалён' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить тип короба', variant: 'destructive' }) },
  })

  // ---- Customer mutations ----
  const createCustomerMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => authFetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { const details = d.details ? d.details.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`).join('; ') : ''; throw new Error(details || d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); closeCustomerDialog(); toast({ title: 'Заказчик добавлен' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => authFetch(`/api/customers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { const details = d.details ? d.details.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`).join('; ') : ''; throw new Error(details || d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); closeCustomerDialog(); toast({ title: 'Заказчик обновлён' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => authFetch(`/api/customers/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); toast({ title: 'Заказчик удалён' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить заказчика', variant: 'destructive' }) },
  })

  // ---- Material type mutations ----
  const createMaterialTypeMutation = useMutation({
    mutationFn: (data: { name: string; category: 'fabric' | 'furniture' }) => authFetch('/api/material-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['material-types'] }); setNewMaterialTypeName(''); setNewMaterialTypeCategory('fabric'); toast({ title: 'Тип материала добавлен' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const deleteMaterialTypeMutation = useMutation({
    mutationFn: (id: string) => authFetch(`/api/material-types/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['material-types'] }); toast({ title: 'Тип материала удалён' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить тип материала', variant: 'destructive' }) },
  })

  // ---- Material mutations ----
  const createMaterialMutation = useMutation({
    mutationFn: (data: { name: string; materialTypeId: string; baseUnit: string; inputUnit: string; conversionRate: number; totalQty: number; ownershipType?: string; customerId?: string }) => authFetch('/api/materials', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['material-types'] }); queryClient.invalidateQueries({ queryKey: ['material-norms'] }); setNewMaterialName(''); setNewMaterialBaseUnit('пм'); setNewMaterialInputUnit('пм'); setNewMaterialConversionRate('1'); setNewMaterialInputQty(''); setNewMaterialOwnership('own'); setNewMaterialCustomerId(''); setAddingMaterialToTypeId(null); toast({ title: 'Материал добавлен' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const deleteMaterialMutation = useMutation({
    mutationFn: (id: string) => authFetch(`/api/materials/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['material-types'] }); toast({ title: 'Материал удалён' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить материал', variant: 'destructive' }) },
  })

  // ---- Material norm mutations ----
  const createMaterialNormMutation = useMutation({
    mutationFn: (data: { materialId: string; productId: string; consumptionPerUnit: number; unit?: string }) => authFetch('/api/material-norms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['material-norms'] }); setNewNormProductId(''); setNewNormMaterialId(''); setNewNormConsumption(''); setNewNormUnit('гр'); toast({ title: 'Норма расхода добавлена' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })
  const deleteMaterialNormMutation = useMutation({
    mutationFn: (id: string) => authFetch(`/api/material-norms?id=${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['material-norms'] }); toast({ title: 'Норма расхода удалена' }) },
    onError: () => { toast({ title: 'Ошибка', description: 'Не удалось удалить норму расхода', variant: 'destructive' }) },
  })

  // ---- Material entry mutations ----
  const createEntryMutation = useMutation({
    mutationFn: (data: { materialId: string; type: 'incoming' | 'consumed'; qty: number; inputQty: number; inputUnit: string; conversionRate: number; note?: string }) => authFetch('/api/material-entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then((r) => { if (!r.ok) return r.json().then((d) => { throw new Error(d.error || 'Ошибка') }); return r.json() }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['material-types'] }); queryClient.invalidateQueries({ queryKey: ['material-entries'] }); setEntryDialogOpen(false); setEntryInputQty(''); setEntryInputUnit(''); setEntryConversionRate('1'); setEntryNote(''); toast({ title: entryType === 'incoming' ? 'Приход добавлен' : 'Расход списан' }) },
    onError: (err: Error) => { toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }) },
  })

  const { data: materialEntries = [] } = useQuery({
    queryKey: ['material-entries', historyMaterialId],
    queryFn: async () => {
      const r = await authFetch(`/api/material-entries?materialId=${historyMaterialId}`)
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
    enabled: !!historyMaterialId && historyDialogOpen,
  })

  // ---- Product dialog helpers ----
  const openCreateProduct = useCallback(() => {
    setEditingProduct(null)
    setProductForm({ name: '', article: '', sewerRate: 150, homeRate: 0, qcRate: 50, reworkRate: 80, ironingRate: 10, cuttingRate: 30, isKit: false, kitComboColors: {} })
    setProductSizes([])
    setProductColors([])
    setNewSize('')
    setNewColor('')
    setNewColorHex('#9ca3af')
    setNewKitKey('')
    setNewKitValue('')
    setProductDialogOpen(true)
  }, [])

  const openEditProduct = useCallback((p: Product) => {
    setEditingProduct(p)
    const parsedKitComboColors = parseKitComboColors(p.kitComboColors)
    setProductForm({ name: p.name, article: p.article, sewerRate: p.sewerRate, homeRate: p.homeRate, qcRate: p.qcRate, reworkRate: p.reworkRate, ironingRate: p.ironingRate ?? 10, cuttingRate: p.cuttingRate ?? 30, isKit: p.isKit, kitComboColors: parsedKitComboColors })
    setProductSizes(p.sizes.map(s => s.size))
    setProductColors(p.colors.map(c => ({ color: c.color, colorHex: c.colorHex })))
    setNewSize('')
    setNewColor('')
    setNewColorHex('#9ca3af')
    setNewKitKey('')
    setNewKitValue('')
    setProductDialogOpen(true)
  }, [])

  const closeProductDialog = useCallback(() => { setProductDialogOpen(false); setEditingProduct(null) }, [])

  const handleSaveProduct = useCallback(() => {
    if (!productForm.name.trim() || !productForm.article.trim()) {
      toast({ title: 'Ошибка', description: 'Заполните название и артикул', variant: 'destructive' }); return
    }
    const data: Record<string, unknown> = {
      name: productForm.name,
      article: productForm.article,
      sewerRate: productForm.sewerRate,
      homeRate: productForm.homeRate,
      qcRate: productForm.qcRate,
      reworkRate: productForm.reworkRate,
      ironingRate: productForm.ironingRate,
      cuttingRate: productForm.cuttingRate,
      isKit: productForm.isKit,
      kitComboColors: productForm.isKit ? productForm.kitComboColors : null,
      sizes: productSizes,
      colors: productColors,
    }
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data })
    } else {
      createProductMutation.mutate(data)
    }
  }, [productForm, productSizes, productColors, editingProduct, updateProductMutation, createProductMutation, toast])

  const applySizeGrid = useCallback((gridLabel: string) => {
    const grid = STANDARD_SIZE_GRIDS.find(g => g.label === gridLabel)
    if (!grid) return
    setProductSizes(prev => {
      const merged = new Set([...prev, ...grid.sizes])
      return Array.from(merged)
    })
  }, [])

  const addProductSize = useCallback(() => {
    if (!newSize.trim()) return
    setProductSizes(prev => prev.includes(newSize.trim()) ? prev : [...prev, newSize.trim()])
    setNewSize('')
  }, [newSize])

  const removeProductSize = useCallback((size: string) => {
    setProductSizes(prev => prev.filter(s => s !== size))
  }, [])

  const moveSizeUp = useCallback((index: number) => {
    if (index <= 0) return
    setProductSizes(prev => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }, [])

  const moveSizeDown = useCallback((index: number) => {
    setProductSizes(prev => {
      if (index >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }, [])

  const [dragSizeIndex, setDragSizeIndex] = useState<number | null>(null)
  const [dragOverSizeIndex, setDragOverSizeIndex] = useState<number | null>(null)

  const handleSizeDragStart = useCallback((index: number) => {
    setDragSizeIndex(index)
  }, [setDragSizeIndex])

  const handleSizeDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverSizeIndex(index)
  }, [setDragOverSizeIndex])

  const handleSizeDrop = useCallback((dropIndex: number) => {
    if (dragSizeIndex === null || dragSizeIndex === dropIndex) {
      setDragSizeIndex(null)
      setDragOverSizeIndex(null)
      return
    }
    setProductSizes(prev => {
      const next = [...prev]
      const [dragged] = next.splice(dragSizeIndex, 1)
      next.splice(dropIndex, 0, dragged)
      return next
    })
    setDragSizeIndex(null)
    setDragOverSizeIndex(null)
  }, [dragSizeIndex, setDragSizeIndex, setDragOverSizeIndex])

  const applyStandardColor = useCallback((colorName: string, hex: string) => {
    setProductColors(prev => {
      if (prev.find(c => c.color === colorName)) return prev
      return [...prev, { color: colorName, colorHex: hex }]
    })
  }, [])

  const addProductColor = useCallback(() => {
    if (!newColor.trim()) return
    setProductColors(prev => prev.find(c => c.color === newColor.trim()) ? prev : [...prev, { color: newColor.trim(), colorHex: newColorHex }])
    setNewColor('')
    setNewColorHex('#9ca3af')
  }, [newColor, newColorHex])

  const removeProductColor = useCallback((color: string) => {
    setProductColors(prev => prev.filter(c => c.color !== color))
  }, [])

  const toggleIsKit = useCallback((checked: boolean) => {
    setProductForm(prev => ({
      ...prev,
      isKit: checked,
      kitComboColors: checked ? (Object.keys(prev.kitComboColors).length === 0 ? {} : prev.kitComboColors) : {},
    }))
  }, [])

  const addKitCombo = useCallback(() => {
    if (!newKitKey.trim()) return
    const values = newKitValue.trim() ? newKitValue.split(',').map(v => v.trim()).filter(Boolean) : []
    setProductForm(prev => ({ ...prev, kitComboColors: { ...prev.kitComboColors, [newKitKey.trim()]: values } }))
    setNewKitKey('')
    setNewKitValue('')
  }, [newKitKey, newKitValue])

  const removeKitCombo = useCallback((key: string) => {
    setProductForm(prev => {
      const next = { ...prev.kitComboColors }
      delete next[key]
      return { ...prev, kitComboColors: next }
    })
  }, [])

  // ---- Employee dialog helpers ----
  const openCreateEmployee = useCallback(() => {
    setEditingEmployee(null)
    setEmployeeForm({ name: '', code: '', username: '', password: '', role: 'sewer' })
    setEmployeeDialogOpen(true)
  }, [])

  const openEditEmployee = useCallback((e: EmployeeWithAuth) => {
    setEditingEmployee(e)
    setEmployeeForm({ name: e.name, code: e.code, username: e.username, password: '', role: e.role })
    setEmployeeDialogOpen(true)
  }, [])

  const closeEmployeeDialog = useCallback(() => { setEmployeeDialogOpen(false); setEditingEmployee(null) }, [])

  const handleSaveEmployee = useCallback(() => {
    if (!employeeForm.name.trim() || !employeeForm.code.trim()) {
      toast({ title: 'Ошибка', description: 'Заполните ФИО и код', variant: 'destructive' }); return
    }
    if (!editingEmployee && (!employeeForm.username.trim() || !employeeForm.password.trim())) {
      toast({ title: 'Ошибка', description: 'Заполните логин и пароль', variant: 'destructive' }); return
    }
    const data: Record<string, string> = { name: employeeForm.name, code: employeeForm.code, role: employeeForm.role }
    if (employeeForm.username) data.username = employeeForm.username
    if (employeeForm.password) data.password = employeeForm.password
    if (editingEmployee) {
      updateEmployeeMutation.mutate({ id: editingEmployee.id, data })
    } else {
      data.username = employeeForm.username
      data.password = employeeForm.password
      createEmployeeMutation.mutate(data)
    }
  }, [employeeForm, editingEmployee, updateEmployeeMutation, createEmployeeMutation, toast])

  // ---- Customer dialog helpers ----
  const openCreateCustomer = useCallback(() => {
    setEditingCustomer(null)
    setCustomerForm({ name: '', type: 'organization', inn: '', kpp: '', legalAddress: '', postalAddress: '', phone: '', email: '', bankName: '', bik: '', checkingAccount: '', corrAccount: '', bankCity: '', contactInfo: '', showMaterialBalance: false })
    setCustomerDialogOpen(true)
  }, [])

  const openEditCustomer = useCallback((c: { id: string; name: string; type?: string; inn?: string | null; kpp?: string | null; legalAddress?: string | null; postalAddress?: string | null; phone?: string | null; email?: string | null; bankName?: string | null; bik?: string | null; checkingAccount?: string | null; corrAccount?: string | null; bankCity?: string | null; contactInfo?: string | null; showMaterialBalance?: boolean }) => {
    const custType = (c.type as 'organization' | 'ip' | 'individual') || 'organization'
    setEditingCustomer({ id: c.id, name: c.name, type: custType, inn: c.inn || '', kpp: c.kpp || '', legalAddress: c.legalAddress || '', postalAddress: c.postalAddress || '', phone: c.phone || '', email: c.email || '', bankName: c.bankName || '', bik: c.bik || '', checkingAccount: c.checkingAccount || '', corrAccount: c.corrAccount || '', bankCity: c.bankCity || '', contactInfo: c.contactInfo || '', showMaterialBalance: c.showMaterialBalance || false })
    setCustomerForm({ name: c.name, type: custType, inn: c.inn || '', kpp: c.kpp || '', legalAddress: c.legalAddress || '', postalAddress: c.postalAddress || '', phone: c.phone || '', email: c.email || '', bankName: c.bankName || '', bik: c.bik || '', checkingAccount: c.checkingAccount || '', corrAccount: c.corrAccount || '', bankCity: c.bankCity || '', contactInfo: c.contactInfo || '', showMaterialBalance: c.showMaterialBalance || false })
    setCustomerDialogOpen(true)
  }, [])

  const closeCustomerDialog = useCallback(() => { setCustomerDialogOpen(false); setEditingCustomer(null) }, [])

  const handleSaveCustomer = useCallback(() => {
    if (!customerForm.name.trim()) {
      toast({ title: 'Ошибка', description: 'Заполните название', variant: 'destructive' }); return
    }
    const data: Record<string, unknown> = {
      name: customerForm.name,
      type: customerForm.type,
      inn: customerForm.inn.trim() || null,
      kpp: customerForm.type === 'organization' ? (customerForm.kpp.trim() || null) : null,
      legalAddress: customerForm.legalAddress.trim() || null,
      postalAddress: customerForm.postalAddress.trim() || null,
      phone: customerForm.phone.trim() || null,
      email: customerForm.email.trim() || null,
      bankName: customerForm.bankName.trim() || null,
      bik: customerForm.bik.trim() || null,
      checkingAccount: customerForm.checkingAccount.trim() || null,
      corrAccount: customerForm.corrAccount.trim() || null,
      bankCity: customerForm.bankCity.trim() || null,
      contactInfo: customerForm.contactInfo.trim() || null,
    }
    if (editingCustomer) {
      updateCustomerMutation.mutate({ id: editingCustomer.id, data: { ...data, showMaterialBalance: customerForm.showMaterialBalance } })
    } else {
      createCustomerMutation.mutate(data)
    }
  }, [customerForm, editingCustomer, updateCustomerMutation, createCustomerMutation, toast])

  // ---- Material type helpers ----
  const toggleMaterialTypeExpand = useCallback((id: string) => {
    setExpandedMaterialTypeIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const handleAddMaterial = useCallback((materialTypeId: string) => {
    if (!newMaterialName.trim()) {
      toast({ title: 'Ошибка', description: 'Введите название материала', variant: 'destructive' }); return
    }
    if (newMaterialOwnership === 'customer' && !newMaterialCustomerId) {
      toast({ title: 'Ошибка', description: 'Выберите заказчика для давальческого материала', variant: 'destructive' }); return
    }
    const convRate = newMaterialInputUnit !== newMaterialBaseUnit ? (parseFloat(newMaterialConversionRate) || 1) : 1
    createMaterialMutation.mutate({
      name: newMaterialName,
      materialTypeId,
      baseUnit: newMaterialBaseUnit,
      inputUnit: newMaterialInputUnit,
      conversionRate: convRate,
      totalQty: parseFloat(newMaterialInputQty) || 0,
      ownershipType: newMaterialOwnership,
      customerId: newMaterialOwnership === 'customer' ? newMaterialCustomerId : undefined,
    })
  }, [newMaterialName, newMaterialBaseUnit, newMaterialInputUnit, newMaterialConversionRate, newMaterialInputQty, newMaterialOwnership, newMaterialCustomerId, createMaterialMutation, toast])

  const handleAddMaterialNorm = useCallback(() => {
    if (!newNormProductId || !newNormMaterialId || !newNormConsumption) {
      toast({ title: 'Ошибка', description: 'Заполните все поля нормы расхода', variant: 'destructive' }); return
    }
    createMaterialNormMutation.mutate({
      materialId: newNormMaterialId,
      productId: newNormProductId,
      consumptionPerUnit: parseFloat(newNormConsumption) || 0,
      unit: newNormUnit || undefined,
    })
  }, [newNormProductId, newNormMaterialId, newNormConsumption, newNormUnit, createMaterialNormMutation, toast])

  // ---- All materials flat list (for norm select) ----
  const allMaterials = useMemo(() => {
    return (materialTypes as Array<{ id: string; name: string; category: string; materials: Array<{ id: string; name: string; baseUnit: string; inputUnit: string; conversionRate: number; materialTypeId: string; ownershipType?: string; customer?: { id: string; name: string } | null }> }>).flatMap(mt => mt.materials || [])
  }, [materialTypes])

  // ---- Loading state ----
  if (productsLoading || employeesLoading || citiesLoading || boxTypesLoading || customersLoading || materialTypesLoading || materialNormsLoading) {
    return (<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /><span className="ml-2 text-muted-foreground">Загрузка...</span></div>)
  }

  const getRoleLabel = (role: string) => EMPLOYEE_ROLES.find(r => r.value === role)?.label || role

  return (
    <div className="space-y-8">
      {/* ===== ГОРОДА ===== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2"><MapPin className="h-5 w-5 text-emerald-500" />Города</h3>
        </div>
        <div className="flex gap-2 mb-3">
          <Input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="Название города" onKeyDown={(e) => { if (e.key === 'Enter' && newCity.trim()) { createCityMutation.mutate(newCity.trim()) } }} />
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { if (newCity.trim()) createCityMutation.mutate(newCity.trim()) }} disabled={createCityMutation.isPending}><Plus className="h-4 w-4 mr-1" />Добавить</Button>
        </div>
        {cities.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-6 text-center text-muted-foreground text-sm">Нет городов</CardContent></Card>
        ) : (
          <div className="flex flex-wrap gap-2">
            {cities.map((city: { id: string; name: string }) => (
              <Badge key={city.id} variant="secondary" className="gap-1 py-1.5 px-3">
                {city.name}
                <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => deleteCityMutation.mutate(city.id)} />
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* ===== ТИПЫ КОРОБОВ ===== */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2"><Package className="h-5 w-5 text-emerald-500" />Типы коробов</h3>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setNewBoxName(''); setNewBoxDimensions(''); setNewCapacities([]); setBoxDialogOpen(true) }}><Plus className="h-4 w-4 mr-1" />Добавить</Button>
        </div>
        {boxTypes.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-6 text-center text-muted-foreground text-sm">Нет типов коробов</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {boxTypes.map((bt: { id: string; name: string; dimensions: string | null; capacities: Array<{ id: string; productId: string; size: string; maxQty: number; product?: { name: string } }> }) => (
              <Card key={bt.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{bt.name}</span>
                    {bt.dimensions && <span className="text-sm text-muted-foreground ml-2">({bt.dimensions})</span>}
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteBoxTypeMutation.mutate(bt.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
                {bt.capacities.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {bt.capacities.map((cap) => (
                      <Badge key={cap.id} variant="outline" className="text-xs">
                        {cap.product?.name || cap.productId} / {cap.size}: {cap.maxQty} шт
                      </Badge>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* ===== ЗАКАЗЧИКИ ===== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-emerald-500" />Заказчики</h3>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openCreateCustomer}><Plus className="h-4 w-4 mr-1" />Добавить</Button>
        </div>
        {customers.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground">Нет заказчиков</CardContent></Card>
        ) : (
          <div className="border rounded-lg overflow-x-auto">
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Название</TableHead>
                    <TableHead>Контакты</TableHead>
                    <TableHead>Изделия</TableHead>
                    <TableHead>Материалы</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(customers as Array<{ id: string; name: string; type?: string; inn?: string | null; kpp?: string | null; legalAddress?: string | null; postalAddress?: string | null; phone?: string | null; email?: string | null; bankName?: string | null; bik?: string | null; checkingAccount?: string | null; corrAccount?: string | null; bankCity?: string | null; contactInfo?: string | null; showMaterialBalance?: boolean; customerProducts: Array<{ id: string; product: { name: string } }> }>).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <div>{c.name}</div>
                        {c.inn && <div className="text-xs text-muted-foreground">ИНН {c.inn}</div>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{c.contactInfo || '—'}</TableCell>
                      <TableCell>
                        {c.customerProducts.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.customerProducts.map((cp) => (
                              <Badge key={cp.id} variant="outline" className="text-xs">{cp.product.name}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.showMaterialBalance ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">Открыт</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => openEditCustomer(c)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteCustomerMutation.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* ===== МАТЕРИАЛЫ И НОРМЫ РАСХОДОВ ===== */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4"><ClipboardList className="h-5 w-5 text-emerald-500" />Материалы и нормы расходов</h3>

        {/* Add material type */}
        <div className="flex gap-2 mb-4 items-end">
          <div className="flex-1 max-w-[200px]"><Label className="text-xs text-muted-foreground">Тип материала</Label><Input value={newMaterialTypeName} onChange={(e) => setNewMaterialTypeName(e.target.value)} placeholder="Ткань, Фурнитура..." onKeyDown={(e) => { if (e.key === 'Enter' && newMaterialTypeName.trim()) createMaterialTypeMutation.mutate({ name: newMaterialTypeName, category: newMaterialTypeCategory }) }} /></div>
          <div className="w-40"><Label className="text-xs text-muted-foreground">Категория</Label>
            <Select value={newMaterialTypeCategory} onValueChange={(v: 'fabric' | 'furniture') => setNewMaterialTypeCategory(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fabric">Ткань</SelectItem>
                <SelectItem value="furniture">Фурнитура</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { if (newMaterialTypeName.trim()) createMaterialTypeMutation.mutate({ name: newMaterialTypeName, category: newMaterialTypeCategory }) }} disabled={createMaterialTypeMutation.isPending}><Plus className="h-4 w-4 mr-1" />Добавить</Button>
        </div>

        {/* Material Types with nested Materials */}
        {materialTypes.length === 0 ? (
          <Card className="border-dashed"><CardContent className="py-6 text-center text-muted-foreground text-sm">Нет типов материалов</CardContent></Card>
        ) : (
          <div className="space-y-2 mb-6">
            {(materialTypes as Array<{ id: string; name: string; category: string; materials: Array<{ id: string; name: string; baseUnit: string; inputUnit: string; conversionRate: number; totalQty: number; ownershipType?: string; customer?: { id: string; name: string } | null }> }>).map((mt) => {
              const isExpanded = expandedMaterialTypeIds.has(mt.id)
              const isAdding = addingMaterialToTypeId === mt.id
              const mtCategory = mt.category || 'fabric'
              const FABRIC_BASE_UNITS = ['пм', 'кг']
              const FABRIC_INPUT_UNITS = ['пм', 'кг']
              const FURNITURE_BASE_UNITS = ['шт', 'м']
              const FURNITURE_INPUT_UNITS = ['шт', 'упак', 'бобина', 'м']
              const baseUnits = mtCategory === 'furniture' ? FURNITURE_BASE_UNITS : FABRIC_BASE_UNITS
              const inputUnits = mtCategory === 'furniture' ? FURNITURE_INPUT_UNITS : FABRIC_INPUT_UNITS
              const categoryLabel = mtCategory === 'fabric' ? 'Ткань' : 'Фурнитура'
              const needsConversion = newMaterialInputUnit !== newMaterialBaseUnit
              return (
                <Card key={mt.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => toggleMaterialTypeExpand(mt.id)}>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      <span className="font-medium">{mt.name}</span>
                      <Badge variant="outline" className="text-xs">{categoryLabel}</Badge>
                      <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-50">{mt.materials.length} мат.</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-7" onClick={() => { setAddingMaterialToTypeId(isAdding ? null : mt.id); setNewMaterialName(''); setNewMaterialBaseUnit(baseUnits[0]); setNewMaterialInputUnit(baseUnits[0]); setNewMaterialConversionRate('1'); setNewMaterialInputQty('') }}><Plus className="h-3.5 w-3.5 mr-0.5" />Материал</Button>
                      <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7" onClick={() => deleteMaterialTypeMutation.mutate(mt.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>

                  {/* Add material inline */}
                  {isAdding && (
                    <div className="mt-3 border-t pt-3 space-y-2">
                      <div className="flex gap-2 items-end flex-wrap">
                        <div className="flex-1 min-w-[160px]"><Label className="text-xs text-muted-foreground">Название</Label><Input value={newMaterialName} onChange={(e) => setNewMaterialName(e.target.value)} placeholder="Название материала" onKeyDown={(e) => { if (e.key === 'Enter') handleAddMaterial(mt.id) }} /></div>
                        <div className="w-36"><Label className="text-xs text-muted-foreground">Базовая единица</Label>
                          <Select value={newMaterialBaseUnit} onValueChange={(v) => { setNewMaterialBaseUnit(v); if (!inputUnits.includes(v)) { setNewMaterialInputUnit(v); setNewMaterialConversionRate('1') } }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {baseUnits.map((u) => (<SelectItem key={u} value={u}>{u}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-36"><Label className="text-xs text-muted-foreground">Ед. поступления</Label>
                          <Select value={newMaterialInputUnit} onValueChange={(v) => { setNewMaterialInputUnit(v); if (v === newMaterialBaseUnit) setNewMaterialConversionRate('1') }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {inputUnits.map((u) => (<SelectItem key={u} value={u}>{u}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </div>
                        {needsConversion && (
                          <div className="w-40"><Label className="text-xs text-muted-foreground">Коэфф. конвертации (1 {newMaterialInputUnit} = ? {newMaterialBaseUnit})</Label><Input type="number" min="0.01" step="0.01" value={newMaterialConversionRate} onChange={(e) => setNewMaterialConversionRate(e.target.value)} placeholder="1" /></div>
                        )}
                        <div className="w-28"><Label className="text-xs text-muted-foreground">Кол-во ({newMaterialInputUnit})</Label><Input type="number" min="0" step="0.01" value={newMaterialInputQty} onChange={(e) => setNewMaterialInputQty(e.target.value)} placeholder="0" /></div>
                      </div>
                      {needsConversion && newMaterialInputQty && parseFloat(newMaterialInputQty) > 0 && (
                        <div className="text-xs text-muted-foreground bg-emerald-50 rounded px-2 py-1">
                          {newMaterialInputQty} {newMaterialInputUnit} × {newMaterialConversionRate} = {(parseFloat(newMaterialInputQty) * (parseFloat(newMaterialConversionRate) || 1)).toLocaleString('ru-RU')} {newMaterialBaseUnit}
                        </div>
                      )}
                      <div className="flex gap-2 items-end flex-wrap">
                        <div className="w-44">
                          <Label className="text-xs text-muted-foreground">Тип собственности</Label>
                          <Select value={newMaterialOwnership} onValueChange={(v: 'own' | 'customer') => { setNewMaterialOwnership(v); if (v === 'own') setNewMaterialCustomerId('') }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="own">Свой</SelectItem>
                              <SelectItem value="customer">Давальческий</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {newMaterialOwnership === 'customer' && (
                          <div className="flex-1 min-w-[160px]">
                            <Label className="text-xs text-muted-foreground">Заказчик</Label>
                            <Select value={newMaterialCustomerId} onValueChange={setNewMaterialCustomerId}>
                              <SelectTrigger><SelectValue placeholder="Выберите заказчика" /></SelectTrigger>
                              <SelectContent>
                                {(customers as CustomerEditData[]).map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAddMaterial(mt.id)} disabled={createMaterialMutation.isPending}>Добавить</Button>
                        <Button size="sm" variant="ghost" onClick={() => setAddingMaterialToTypeId(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  )}

                  {/* Nested materials list */}
                  {isExpanded && mt.materials.length > 0 && (
                    <div className="mt-3 border-t pt-3 space-y-1">
                      {mt.materials.map((m) => {
                        const mNeedsConversion = m.inputUnit !== m.baseUnit && m.conversionRate !== 1
                        const inputQty = mNeedsConversion && m.conversionRate > 0 ? m.totalQty / m.conversionRate : 0
                        return (
                          <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{m.name}</span>
                              <Badge variant="outline" className="text-xs">{m.baseUnit}</Badge>
                              {mNeedsConversion && (
                                <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">{m.inputUnit}</Badge>
                              )}
                              <Badge className={`text-xs ${m.totalQty > 0 ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}>
                                {mNeedsConversion && inputQty > 0
                                  ? `${inputQty.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${m.inputUnit} → ${m.totalQty.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${m.baseUnit}`
                                  : `${m.totalQty.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${m.baseUnit}`
                                }
                              </Badge>
                              {mNeedsConversion && (
                                <Badge variant="outline" className="text-xs text-purple-600 border-purple-200">1 {m.inputUnit} = {m.conversionRate} {m.baseUnit}</Badge>
                              )}
                              <Badge className={`text-xs ${m.ownershipType === 'customer' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-blue-100 text-blue-700 hover:bg-blue-100'}`}>{m.ownershipType === 'customer' ? 'Давальческий' : 'Свой'}</Badge>
                              {m.ownershipType === 'customer' && m.customer && (
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">{m.customer.name}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5">
                              <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-6 px-1.5" title="Приход" onClick={() => { setEntryMaterialId(m.id); setEntryType('incoming'); setEntryInputUnit(m.inputUnit); setEntryConversionRate(String(m.conversionRate)); setEntryDialogOpen(true) }}><ArrowDownCircle className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-6 px-1.5" title="Расход" onClick={() => { setEntryMaterialId(m.id); setEntryType('consumed'); setEntryInputUnit(m.inputUnit); setEntryConversionRate(String(m.conversionRate)); setEntryDialogOpen(true) }}><ArrowUpCircle className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-6 px-1.5" title="История" onClick={() => { setHistoryMaterialId(m.id); setHistoryDialogOpen(true) }}><History className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 h-6 px-1.5" onClick={() => deleteMaterialMutation.mutate(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {isExpanded && mt.materials.length === 0 && (
                    <div className="mt-3 border-t pt-3 text-xs text-muted-foreground">Нет материалов в этом типе</div>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        <Separator className="my-6" />

        {/* Material Norms table */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-3">Нормы расходов</h4>
          {materialNorms.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-6 text-center text-muted-foreground text-sm">Нет норм расходов</CardContent></Card>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <div className="overflow-x-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Изделие</TableHead>
                      <TableHead>Материал</TableHead>
                      <TableHead className="text-center">Расход на ед.</TableHead>
                      <TableHead>Ед. изм.</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(materialNorms as Array<{ id: string; consumptionPerUnit: number; unit: string; material: { name: string; baseUnit: string; ownershipType?: string; customer?: { id: string; name: string } | null }; product: { name: string } }>).map((norm) => (
                      <TableRow key={norm.id}>
                        <TableCell className="font-medium">{norm.product.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {norm.material.name}
                            <Badge className={`text-xs ${norm.material.ownershipType === 'customer' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-blue-100 text-blue-700 hover:bg-blue-100'}`}>{norm.material.ownershipType === 'customer' ? 'Давальч.' : 'Свой'}</Badge>
                            {norm.material.ownershipType === 'customer' && norm.material.customer && (
                              <span className="text-xs text-amber-600">({norm.material.customer.name})</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{norm.consumptionPerUnit}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{norm.unit}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteMaterialNormMutation.mutate(norm.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Add norm form */}
        <Card className="p-4 border-dashed">
          <h4 className="text-sm font-semibold mb-3">Добавить норму расхода</h4>
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs text-muted-foreground">Изделие</Label>
              <Select value={newNormProductId} onValueChange={setNewNormProductId}>
                <SelectTrigger><SelectValue placeholder="Выберите изделие" /></SelectTrigger>
                <SelectContent>
                  {(products as Product[]).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.article})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <Label className="text-xs text-muted-foreground">Материал</Label>
              <Select value={newNormMaterialId} onValueChange={setNewNormMaterialId}>
                <SelectTrigger><SelectValue placeholder="Выберите материал" /></SelectTrigger>
                <SelectContent>
                  {allMaterials.map((m: { id: string; name: string; baseUnit: string; ownershipType?: string; customer?: { id: string; name: string } | null }) => (
                    <SelectItem key={m.id} value={m.id}>{m.name} ({m.baseUnit}){m.ownershipType === 'customer' ? ' — Давальч.' : ''}{m.ownershipType === 'customer' && m.customer ? ` (${m.customer.name})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28">
              <Label className="text-xs text-muted-foreground">Расход на ед.</Label>
              <Input type="number" min="0" step="0.01" value={newNormConsumption} onChange={(e) => setNewNormConsumption(e.target.value)} placeholder="0" />
            </div>
            <div className="w-24">
              <Label className="text-xs text-muted-foreground">Ед. изм.</Label>
              <Input value={newNormUnit} onChange={(e) => setNewNormUnit(e.target.value)} placeholder="гр" />
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAddMaterialNorm} disabled={createMaterialNormMutation.isPending}><Plus className="h-4 w-4 mr-1" />Добавить</Button>
          </div>
        </Card>
      </div>

      {/* ===== PRODUCT DIALOG ===== */}
      <Dialog open={productDialogOpen} onOpenChange={(open) => { if (!open) closeProductDialog(); else setProductDialogOpen(true) }}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh]">
          <DialogHeader><DialogTitle>{editingProduct ? 'Редактировать изделие' : 'Новое изделие'}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[75vh] pr-4">
            <div className="space-y-5">
              {/* Basic info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Название *</Label><Input value={productForm.name} onChange={(e) => setProductForm(p => ({ ...p, name: e.target.value }))} placeholder="Футболка женская" /></div>
                <div className="space-y-2"><Label>Артикул *</Label><Input value={productForm.article} onChange={(e) => setProductForm(p => ({ ...p, article: e.target.value }))} placeholder="ФЖ-01" /></div>
              </div>
              {/* Ставки */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-2"><Label className="text-xs">Швея (за ед.)</Label><Input type="number" min="0" value={productForm.sewerRate || ''} onChange={(e) => setProductForm(p => ({ ...p, sewerRate: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><Label className="text-xs">Надомница (за ед.)</Label><Input type="number" min="0" value={productForm.homeRate || ''} onChange={(e) => setProductForm(p => ({ ...p, homeRate: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><Label className="text-xs">ВТО (за ед.)</Label><Input type="number" min="0" value={productForm.ironingRate || ''} onChange={(e) => setProductForm(p => ({ ...p, ironingRate: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><Label className="text-xs">Крой (за ед.)</Label><Input type="number" min="0" value={productForm.cuttingRate || ''} onChange={(e) => setProductForm(p => ({ ...p, cuttingRate: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><Label className="text-xs">ОТК (за ед.)</Label><Input type="number" min="0" value={productForm.qcRate || ''} onChange={(e) => setProductForm(p => ({ ...p, qcRate: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><Label className="text-xs">Переделка (за ед.)</Label><Input type="number" min="0" value={productForm.reworkRate || ''} onChange={(e) => setProductForm(p => ({ ...p, reworkRate: parseFloat(e.target.value) || 0 }))} /></div>
              </div>

              <Separator />

              {/* Sizes */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-sm font-medium">Размеры</Label>
                  <Select onValueChange={applySizeGrid}>
                    <SelectTrigger className="w-48"><SelectValue placeholder="Применить сетку..." /></SelectTrigger>
                    <SelectContent>
                      {STANDARD_SIZE_GRIDS.map(g => <SelectItem key={g.label} value={g.label}>{g.label} ({g.sizes.join(', ')})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {productSizes.length > 0 && (
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs h-7 ml-auto" onClick={() => setProductSizes([])}>
                      <Trash2 className="h-3 w-3 mr-1" />Удалить все
                    </Button>
                  )}
                </div>
                {productSizes.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {productSizes.map((size, idx) => (
                      <div
                        key={size}
                        draggable
                        onDragStart={() => handleSizeDragStart(idx)}
                        onDragOver={(e) => handleSizeDragOver(e, idx)}
                        onDrop={() => handleSizeDrop(idx)}
                        onDragEnd={() => { setDragSizeIndex(null); setDragOverSizeIndex(null) }}
                        className={`flex items-center gap-0.5 rounded-md border pr-1 cursor-grab active:cursor-grabbing select-none transition-colors ${
                          dragOverSizeIndex === idx && dragSizeIndex !== null && dragSizeIndex !== idx
                            ? 'border-blue-400 bg-blue-50'
                            : dragSizeIndex === idx
                            ? 'border-gray-300 bg-gray-100 opacity-50'
                            : 'border-emerald-200 bg-emerald-50'
                        }`}
                      >
                        <div className="flex flex-col">
                          <button
                            type="button"
                            className={`p-0 leading-none ${idx === 0 ? 'text-gray-300 cursor-default' : 'text-emerald-500 hover:text-emerald-700'}`}
                            onClick={(e) => { e.stopPropagation(); moveSizeUp(idx); }}
                            disabled={idx === 0}
                            title="Переместить вверх"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            className={`p-0 leading-none ${idx === productSizes.length - 1 ? 'text-gray-300 cursor-default' : 'text-emerald-500 hover:text-emerald-700'}`}
                            onClick={(e) => { e.stopPropagation(); moveSizeDown(idx); }}
                            disabled={idx === productSizes.length - 1}
                            title="Переместить вниз"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-medium text-emerald-700 px-1">{size}</span>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-sm p-0.5 hover:bg-red-100 hover:text-red-600 text-gray-400 transition-colors"
                          title={`Удалить размер ${size}`}
                          onClick={(e) => { e.stopPropagation(); removeProductSize(size); }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Размеры не добавлены — выберите сетку или введите вручную</span>
                )}
                <p className="text-xs text-muted-foreground">Перетаскивайте размеры мышкой или используйте стрелки ↑↓ для изменения порядка</p>
                <div className="flex gap-2">
                  <Input value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder="Новый размер" className="w-36" onKeyDown={(e) => { if (e.key === 'Enter') addProductSize() }} />
                  <Button size="sm" variant="outline" onClick={addProductSize}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              <Separator />

              {/* Colors */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-sm font-medium">Цвета</Label>
                  {productColors.length > 0 && (
                    <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs h-7 ml-auto" onClick={() => setProductColors([])}>
                      <Trash2 className="h-3 w-3 mr-1" />Удалить все
                    </Button>
                  )}
                </div>
                {/* Standard colors */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Стандартные цвета — нажмите, чтобы добавить:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STANDARD_COLORS.map(sc => (
                      <button
                        key={sc.color}
                        type="button"
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border transition-colors ${productColors.find(c => c.color === sc.color) ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-gray-200 hover:border-emerald-300'}`}
                        onClick={() => applyStandardColor(sc.color, sc.hex)}
                      >
                        <span className="inline-block w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: sc.hex }} />
                        {sc.color}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Current colors */}
                {productColors.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {productColors.map(c => (
                      <div key={c.color} className="flex items-center gap-1 bg-emerald-50 rounded-md border border-emerald-200 py-1 px-2">
                        <span className="inline-block w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: c.colorHex }} />
                        <span className="text-sm font-medium text-emerald-700">{c.color}</span>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-sm p-0.5 hover:bg-red-100 hover:text-red-600 text-gray-400 transition-colors"
                          title={`Удалить цвет ${c.color}`}
                          onClick={(e) => { e.stopPropagation(); removeProductColor(c.color); }}
                        >
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
                  <div className="flex-1 max-w-[200px]"><Input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="Свой цвет" onKeyDown={(e) => { if (e.key === 'Enter') addProductColor() }} /></div>
                  <div className="flex items-center gap-1">
                    <input type="color" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)} className="w-7 h-8 rounded cursor-pointer border-0 p-0" />
                  </div>
                  <Button size="sm" variant="outline" onClick={addProductColor}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>

              <Separator />

              {/* Kit */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox checked={productForm.isKit} onCheckedChange={(checked) => toggleIsKit(checked === true)} id="isKit" />
                  <Label htmlFor="isKit" className="text-sm font-medium cursor-pointer">Комплект</Label>
                </div>
                {productForm.isKit && (
                  <div className="space-y-3 border rounded-lg p-4 bg-amber-50/50">
                    <Label className="text-sm font-medium">Расшифровка комплекта</Label>
                    <p className="text-xs text-muted-foreground">Например: &quot;ч/б&quot; → [чёрный, белый]. Комбо-цвет в плане раскроя разворачивается в отдельные цвета.</p>
                    {Object.entries(productForm.kitComboColors).map(([key, values]) => (
                      <div key={key} className="flex items-center gap-2 bg-white rounded-md px-3 py-2 border">
                        <span className="font-medium text-sm">{key}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-sm">[{values.join(', ')}]</span>
                        <Button size="sm" variant="ghost" className="text-red-500 ml-auto p-0 h-auto" onClick={() => removeKitCombo(key)}><X className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    <div className="flex gap-2 items-end">
                      <div className="w-24"><Label className="text-xs text-muted-foreground">Код</Label><Input value={newKitKey} onChange={(e) => setNewKitKey(e.target.value)} placeholder="ч/б" /></div>
                      <div className="flex-1"><Label className="text-xs text-muted-foreground">Цвета (через запятую)</Label><Input value={newKitValue} onChange={(e) => setNewKitValue(e.target.value)} placeholder="чёрный, белый" onKeyDown={(e) => { if (e.key === 'Enter') addKitCombo() }} /></div>
                      <Button size="sm" variant="outline" onClick={addKitCombo}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={closeProductDialog}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveProduct} disabled={createProductMutation.isPending || updateProductMutation.isPending}>
              {(createProductMutation.isPending || updateProductMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingProduct ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== EMPLOYEE DIALOG ===== */}
      <Dialog open={employeeDialogOpen} onOpenChange={(open) => { if (!open) closeEmployeeDialog(); else setEmployeeDialogOpen(true) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingEmployee ? 'Редактировать сотрудника' : 'Новый сотрудник'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>ФИО *</Label><Input value={employeeForm.name} onChange={(e) => setEmployeeForm(p => ({ ...p, name: e.target.value }))} placeholder="Иванова Мария" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Код *</Label><Input value={employeeForm.code} onChange={(e) => setEmployeeForm(p => ({ ...p, code: e.target.value }))} placeholder="Ш-001" /></div>
              <div className="space-y-2"><Label>Роль</Label>
                <Select value={employeeForm.role} onValueChange={(v) => setEmployeeForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EMPLOYEE_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{editingEmployee ? 'Логин' : 'Логин *'}</Label><Input value={employeeForm.username} onChange={(e) => setEmployeeForm(p => ({ ...p, username: e.target.value }))} placeholder="login" /></div>
              <div className="space-y-2"><Label>{editingEmployee ? 'Пароль (оставьте пустым)' : 'Пароль *'}</Label><Input type="password" value={employeeForm.password} onChange={(e) => setEmployeeForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEmployeeDialog}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveEmployee} disabled={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}>
              {(createEmployeeMutation.isPending || updateEmployeeMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingEmployee ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== CUSTOMER DIALOG ===== */}
      <Dialog open={customerDialogOpen} onOpenChange={(open) => { if (!open) closeCustomerDialog(); else setCustomerDialogOpen(true) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCustomer ? 'Редактировать заказчика' : 'Новый заказчик'}</DialogTitle></DialogHeader>
          <div className="space-y-6">
            {/* Section 1: Основная информация */}
            <div>
              <h4 className="text-sm font-semibold text-emerald-700 mb-3">Основная информация</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тип заказчика</Label>
                  <Select value={customerForm.type} onValueChange={(v) => setCustomerForm(p => ({ ...p, type: v as 'organization' | 'ip' | 'individual' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="organization">Организация</SelectItem>
                      <SelectItem value="ip">ИП</SelectItem>
                      <SelectItem value="individual">Физлицо</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Название *</Label>
                  <Input value={customerForm.name} onChange={(e) => setCustomerForm(p => ({ ...p, name: e.target.value }))} placeholder="ООО «Текстиль»" />
                </div>
                <div className="space-y-2">
                  <Label>ИНН</Label>
                  <Input value={customerForm.inn} onChange={(e) => setCustomerForm(p => ({ ...p, inn: e.target.value }))} placeholder="10 или 12 цифр" />
                </div>
                {customerForm.type === 'organization' && (
                  <div className="space-y-2">
                    <Label>КПП</Label>
                    <Input value={customerForm.kpp} onChange={(e) => setCustomerForm(p => ({ ...p, kpp: e.target.value }))} placeholder="123456789" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Телефон</Label>
                  <Input value={customerForm.phone} onChange={(e) => setCustomerForm(p => ({ ...p, phone: e.target.value }))} placeholder="+7 (999) 123-45-67" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={customerForm.email} onChange={(e) => setCustomerForm(p => ({ ...p, email: e.target.value }))} placeholder="info@company.ru" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 2: Адреса */}
            <div>
              <h4 className="text-sm font-semibold text-emerald-700 mb-3">Адреса</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Юридический адрес</Label>
                  <Input value={customerForm.legalAddress} onChange={(e) => setCustomerForm(p => ({ ...p, legalAddress: e.target.value }))} placeholder="г. Москва, ул. Примерная, д. 1" />
                </div>
                <div className="space-y-2">
                  <Label>Почтовый адрес</Label>
                  <Input value={customerForm.postalAddress} onChange={(e) => setCustomerForm(p => ({ ...p, postalAddress: e.target.value }))} placeholder="123456, г. Москва, а/я 123" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 3: Банковские реквизиты */}
            <div>
              <h4 className="text-sm font-semibold text-emerald-700 mb-3">Банковские реквизиты</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Название банка</Label>
                  <Input value={customerForm.bankName} onChange={(e) => setCustomerForm(p => ({ ...p, bankName: e.target.value }))} placeholder="ПАО «Сбербанк»" />
                </div>
                <div className="space-y-2">
                  <Label>БИК</Label>
                  <Input value={customerForm.bik} onChange={(e) => setCustomerForm(p => ({ ...p, bik: e.target.value }))} placeholder="044525225" maxLength={9} />
                </div>
                <div className="space-y-2">
                  <Label>Город банка</Label>
                  <Input value={customerForm.bankCity} onChange={(e) => setCustomerForm(p => ({ ...p, bankCity: e.target.value }))} placeholder="Москва" />
                </div>
                <div className="space-y-2">
                  <Label>Расчётный счёт</Label>
                  <Input value={customerForm.checkingAccount} onChange={(e) => setCustomerForm(p => ({ ...p, checkingAccount: e.target.value }))} placeholder="40702810123450001234" maxLength={20} />
                </div>
                <div className="space-y-2">
                  <Label>Корр. счёт</Label>
                  <Input value={customerForm.corrAccount} onChange={(e) => setCustomerForm(p => ({ ...p, corrAccount: e.target.value }))} placeholder="30101810400000000225" maxLength={20} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Контактная информация</Label>
                <Input value={customerForm.contactInfo} onChange={(e) => setCustomerForm(p => ({ ...p, contactInfo: e.target.value }))} placeholder="Доп. контакты, заметки..." />
              </div>
              {editingCustomer && (
                <div className="flex items-center gap-3">
                  <Checkbox id="showMaterialBalance" checked={customerForm.showMaterialBalance} onCheckedChange={(checked) => setCustomerForm(p => ({ ...p, showMaterialBalance: !!checked }))} />
                  <Label htmlFor="showMaterialBalance" className="text-sm">Показывать остатки материалов заказчику</Label>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCustomerDialog}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveCustomer} disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}>
              {(createCustomerMutation.isPending || updateCustomerMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingCustomer ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== ADD BOX TYPE DIALOG ===== */}
      <Dialog open={boxDialogOpen} onOpenChange={setBoxDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Новый тип короба</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Название</Label><Input value={newBoxName} onChange={(e) => setNewBoxName(e.target.value)} placeholder="Малый, Средний..." /></div>
            <div className="space-y-2"><Label>Размеры</Label><Input value={newBoxDimensions} onChange={(e) => setNewBoxDimensions(e.target.value)} placeholder="40x30x20 см" /></div>
            <Separator />
            <div>
              <Label className="text-sm font-medium">Вместимость по изделиям</Label>
              <div className="space-y-2 mt-2">
                {newCapacities.map((cap, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Select value={cap.productId} onValueChange={(v) => setNewCapacities((prev) => prev.map((c, j) => j === i ? { ...c, productId: v } : c))}>
                        <SelectTrigger><SelectValue placeholder="Изделие" /></SelectTrigger>
                        <SelectContent>{products.map((p: Product) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="w-24"><Input value={cap.size} onChange={(e) => setNewCapacities((prev) => prev.map((c, j) => j === i ? { ...c, size: e.target.value } : c))} placeholder="Размер" /></div>
                    <div className="w-20"><Input type="number" min="1" value={cap.maxQty || ''} onChange={(e) => setNewCapacities((prev) => prev.map((c, j) => j === i ? { ...c, maxQty: parseInt(e.target.value) || 0 } : c))} placeholder="Кол." /></div>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => setNewCapacities((prev) => prev.filter((_, j) => j !== i))}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => setNewCapacities((prev) => [...prev, { productId: '', size: '', maxQty: 0 }])}><Plus className="h-4 w-4 mr-1" />Добавить изделие</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBoxDialogOpen(false)}>Отмена</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { if (newBoxName.trim()) createBoxTypeMutation.mutate({ name: newBoxName, dimensions: newBoxDimensions || undefined, capacities: newCapacities.filter((c) => c.productId && c.size && c.maxQty > 0) || undefined }) }} disabled={createBoxTypeMutation.isPending}>{createBoxTypeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== MATERIAL ENTRY DIALOG (Приход/Расход) ===== */}
      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {entryType === 'incoming' ? <ArrowDownCircle className="h-5 w-5 text-emerald-600" /> : <ArrowUpCircle className="h-5 w-5 text-orange-600" />}
              {entryType === 'incoming' ? 'Приход материала' : 'Расход материала'}
            </DialogTitle>
            <DialogDescription>
              {(() => {
                const mat = allMaterials.find((m: { id: string }) => m.id === entryMaterialId)
                return mat ? `${mat.name} — текущий остаток: ${(materialTypes as Array<{ materials: Array<{ id: string; totalQty: number; baseUnit: string }> }>).flatMap(mt => mt.materials).find((m: { id: string }) => m.id === entryMaterialId)?.totalQty?.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) ?? 0} ${mat.baseUnit}` : (entryType === 'incoming' ? 'Добавить остаток ткани или фурнитуры на склад' : 'Списать материал со склада')
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Тип операции</Label>
              <Select value={entryType} onValueChange={(v) => setEntryType(v as 'incoming' | 'consumed')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="incoming">Приход (поступление)</SelectItem>
                  <SelectItem value="consumed">Расход (списание)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ед. поступления</Label>
                <Select value={entryInputUnit} onValueChange={(v) => setEntryInputUnit(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['пм', 'кг', 'шт', 'упак', 'бобина', 'м'] as const).map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Количество ({entryInputUnit || 'ед.'}) *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={entryInputQty}
                  onChange={(e) => setEntryInputQty(e.target.value)}
                  placeholder="Введите количество"
                  autoFocus
                />
              </div>
            </div>
            {entryInputUnit && (() => {
              const mat = allMaterials.find((m: { id: string; baseUnit: string; inputUnit: string }) => m.id === entryMaterialId)
              const baseUnit = mat?.baseUnit || 'шт'
              const needsConversion = entryInputUnit !== baseUnit
              return needsConversion ? (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Коэфф. конвертации (1 {entryInputUnit} = ? {baseUnit})</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={entryConversionRate}
                    onChange={(e) => setEntryConversionRate(e.target.value)}
                    placeholder="1"
                  />
                </div>
              ) : null
            })()}
            {entryInputQty && parseFloat(entryInputQty) > 0 && (() => {
              const mat = allMaterials.find((m: { id: string; baseUnit: string }) => m.id === entryMaterialId)
              const baseUnit = mat?.baseUnit || 'шт'
              const needsConversion = entryInputUnit !== baseUnit
              const baseQty = needsConversion ? parseFloat(entryInputQty) * (parseFloat(entryConversionRate) || 1) : parseFloat(entryInputQty)
              return needsConversion ? (
                <div className="text-xs text-muted-foreground bg-emerald-50 rounded px-2 py-1">
                  {entryInputQty} {entryInputUnit} × {entryConversionRate} = {baseQty.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} {baseUnit}
                </div>
              ) : null
            })()}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Комментарий</Label>
              <Input
                value={entryNote}
                onChange={(e) => setEntryNote(e.target.value)}
                placeholder={entryType === 'incoming' ? 'От поставщика, инвентаризация...' : 'Брак, потеря, корректировка...'}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryDialogOpen(false)}>Отмена</Button>
            <Button
              className={entryType === 'incoming' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'}
              disabled={createEntryMutation.isPending || !entryInputQty || parseFloat(entryInputQty) <= 0}
              onClick={() => {
                const mat = allMaterials.find((m: { id: string; baseUnit: string }) => m.id === entryMaterialId)
                const baseUnit = mat?.baseUnit || 'шт'
                const needsConversion = entryInputUnit !== baseUnit
                const convRate = needsConversion ? (parseFloat(entryConversionRate) || 1) : 1
                const inputQty = parseFloat(entryInputQty)
                const baseQty = inputQty * convRate
                createEntryMutation.mutate({
                  materialId: entryMaterialId,
                  type: entryType,
                  qty: baseQty,
                  inputQty,
                  inputUnit: entryInputUnit,
                  conversionRate: convRate,
                  note: entryNote || undefined,
                })
              }}
            >
              {createEntryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {entryType === 'incoming' ? 'Добавить приход' : 'Списать расход'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== MATERIAL HISTORY DIALOG ===== */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-blue-600" />
              История операций
            </DialogTitle>
            <DialogDescription>Все приходы и расходы выбранного материала</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {materialEntries.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground text-sm">Нет операций</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead className="text-right">Кол-во</TableHead>
                    <TableHead>Комментарий</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(materialEntries as Array<{ id: string; type: string; qty: number; inputQty: number; inputUnit: string | null; conversionRate: number; date: string; note: string | null }>).map((entry) => {
                    const hasConversion = entry.inputUnit && entry.conversionRate > 1
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(entry.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell>
                          {entry.type === 'incoming' ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">Приход</Badge>
                          ) : (
                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-xs">Расход</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <div className="flex flex-col items-end">
                            <span className={entry.type === 'incoming' ? 'text-emerald-700' : 'text-orange-700'}>
                              {entry.type === 'incoming' ? '+' : '-'}{entry.qty.toLocaleString('ru-RU', { maximumFractionDigits: 2 })}
                            </span>
                            {hasConversion && entry.inputQty > 0 && entry.inputUnit && (
                              <span className="text-xs text-muted-foreground">
                                {entry.inputQty.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} {entry.inputUnit}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{entry.note || '—'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
