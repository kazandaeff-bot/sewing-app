'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Loader2,
  Calculator,
  FlaskConical,
  Ruler,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Save,
  Warehouse,
  Package,
  Info,
  RotateCcw,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { authFetch, authFetchJson } from '@/components/auth-provider'

// ============ КАЛЬКУЛЯТОР ТКАНИ ============
// Два режима:
// 1. Расчёт — сколько изделий можно накроить из имеющейся ткани
// 2. Калибровка — определить реальный расход по фактическим данным раскроя

interface SizeDistribution {
  size: string
  percentage: number
}

interface ActualSizeItem {
  size: string
  qty: number
}

interface FabricRoll {
  id: string
  name: string
  totalQty: number
  baseUnit: string
  inputUnit: string
  conversionRate: number
  ownershipType: string
  customerName?: string
}

interface CuttingPlanSummary {
  id: string
  label: string | null
  status: string
  date: string
  totalFabricConsumed: number
  items: Array<{
    productId: string
    productName: string
    size: string
    actualQty: number
  }>
}

interface CalculateResult {
  mode: 'calculate'
  product: { id: string; name: string; article: string }
  material: { id: string; name: string }
  norm: { consumptionPerUnit: number; unit: string }
  fabricQty: number
  fabricUnit: string
  totalQty: number
  totalConsumption: number
  fabricRemaining: number
  sizes: Array<{
    size: string
    qty: number
    percentage: number
    coeff: number
    consumptionPerUnit: number
    totalConsumption: number
  }>
}

interface CalibrateResult {
  mode: 'calibrate'
  product: { id: string; name: string; article: string }
  material: { id: string; name: string }
  norm: { consumptionPerUnit: number; unit: string }
  fabricQty: number
  fabricUnit: string
  totalActualQty: number
  avgConsumption: number
  totalCalculated: number
  sizes: Array<{
    size: string
    qty: number
    coeff: number
    realConsumptionPerUnit: number
    totalConsumption: number
    effectiveCoeff: number
    diffWithNorm: number
    diffPercent: number
  }>
  suggestedCoeffs: Array<{
    size: string
    fabricCoeff: number
  }>
}

export function FabricCalculatorTab() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // ---- Общие параметры ----
  const [productId, setProductId] = useState('')
  const [materialId, setMaterialId] = useState('')
  const [fabricQty, setFabricQty] = useState('')
  const [fabricUnit, setFabricUnit] = useState<'m' | 'kg' | 'gr' | 'pm'>('m')
  const [activeTab, setActiveTab] = useState('calculate')

  // ---- Параметры режима «Расчёт» ----
  const [sizeDistribution, setSizeDistribution] = useState<SizeDistribution[]>([])

  // ---- Параметры режима «Калибровка» ----
  const [actualSizes, setActualSizes] = useState<ActualSizeItem[]>([])

  // ---- Результаты ----
  const [calcResult, setCalcResult] = useState<CalculateResult | null>(null)
  const [calibResult, setCalibResult] = useState<CalibrateResult | null>(null)

  // ---- Диалог подтверждения сохранения коэффициентов ----
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [pendingCoeffs, setPendingCoeffs] = useState<Array<{ size: string; fabricCoeff: number }>>([])

  // ---- Запросы ----
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const r = await authFetch('/api/products')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  // Получаем нормы расхода для выбранного изделия
  const selectedProduct = useMemo(
    () => products.find((p: any) => p.id === productId),
    [products, productId],
  )

  // Материалы (складские остатки) — только ткани
  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const r = await authFetch('/api/materials')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  // Нормы расхода
  const { data: materialNorms = [] } = useQuery({
    queryKey: ['material-norms'],
    queryFn: async () => {
      const r = await authFetch('/api/material-norms')
      const data = await r.json()
      return Array.isArray(data) ? data : []
    },
  })

  // Нормы расхода для выбранного изделия
  const normsForProduct = useMemo(() => {
    if (!productId) return []
    return materialNorms.filter((n: any) => n.productId === productId)
  }, [materialNorms, productId])

  // Авто-выбор материала если только одна норма
  useEffect(() => {
    if (normsForProduct.length === 1) {
      setMaterialId(normsForProduct[0].materialId)
    } else if (normsForProduct.length > 1 && !normsForProduct.find((n: any) => n.materialId === materialId)) {
      setMaterialId('')
    }
  }, [normsForProduct])

  // Размеры изделия
  const productSizes = useMemo(() => {
    if (!selectedProduct) return []
    return (selectedProduct as any).sizes?.map((s: any) => s.size) || []
  }, [selectedProduct])

  // Текущие коэффициенты расхода для изделия
  const sizeRatesMap = useMemo(() => {
    if (!selectedProduct) return {} as Record<string, number>
    const rates = (selectedProduct as any).sizeRates || []
    const map: Record<string, number> = {}
    rates.forEach((r: any) => {
      map[r.size] = r.fabricCoeff ?? 1.0
    })
    return map
  }, [selectedProduct])

  // Информация о выбранном материале (складской остаток)
  const selectedMaterialInfo = useMemo(() => {
    if (!materialId) return null
    return materials.find((m: any) => m.id === materialId) as any || null
  }, [materials, materialId])

  // Доступный остаток выбранного материала
  const materialStock = useMemo(() => {
    if (!selectedMaterialInfo) return null
    return {
      totalQty: selectedMaterialInfo.totalQty,
      baseUnit: selectedMaterialInfo.baseUnit,
      name: selectedMaterialInfo.name,
    }
  }, [selectedMaterialInfo])

  // Автообновление распределения по размерам при смене изделия
  const handleProductChange = useCallback(
    (id: string) => {
      setProductId(id)
      setMaterialId('')
      setFabricQty('')
      setCalcResult(null)
      setCalibResult(null)
      const prod = products.find((p: any) => p.id === id)
      if (prod) {
        const sizes = (prod as any).sizes?.map((s: any) => s.size) || []
        const equalPct = sizes.length > 0 ? Math.floor(100 / sizes.length) : 0
        setSizeDistribution(
          sizes.map((s: string, i: number) => ({
            size: s,
            percentage: i === 0 ? equalPct + (100 - equalPct * sizes.length) : equalPct,
          })),
        )
        setActualSizes(sizes.map((s: string) => ({ size: s, qty: 0 })))
      } else {
        setSizeDistribution([])
        setActualSizes([])
      }
    },
    [products],
  )

  // Подставить остаток со склада в поле количества
  const fillFromStock = useCallback(() => {
    if (!materialStock) return
    setFabricQty(String(materialStock.totalQty))
    // Авто-определение единицы измерения
    const unit = materialStock.baseUnit
    if (['м', 'm', 'метры'].includes(unit.toLowerCase())) setFabricUnit('m')
    else if (['пм', 'pm', 'погонные метры'].includes(unit.toLowerCase())) setFabricUnit('pm')
    else if (['кг', 'kg', 'килограммы'].includes(unit.toLowerCase())) setFabricUnit('kg')
    else if (['гр', 'gr', 'граммы'].includes(unit.toLowerCase())) setFabricUnit('gr')
    toast({ title: `Подставлено ${materialStock.totalQty} ${materialStock.baseUnit} со склада` })
  }, [materialStock, toast])

  // ---- Мутация: расчёт ----
  const calculateMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await authFetchJson('/api/fabric-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return res
    },
    onSuccess: (data: any) => {
      if (data.mode === 'calculate') {
        setCalcResult(data as CalculateResult)
        setCalibResult(null)
      } else {
        setCalibResult(data as CalibrateResult)
        setCalcResult(null)
      }
      toast({ title: 'Расчёт выполнен' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка', description: err.message, variant: 'destructive' })
    },
  })

  // ---- Мутация: сохранить коэффициенты (все разом) ----
  const saveCoeffsMutation = useMutation({
    mutationFn: async ({ coeffs, productId: pid }: { coeffs: Array<{ size: string; fabricCoeff: number }>; productId: string }) => {
      const results = await Promise.all(
        coeffs.map((c) =>
          authFetchJson(`/api/product-size-rates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: pid,
              size: c.size,
              fabricCoeff: c.fabricCoeff,
            }),
          })
        )
      )
      return results
    },
    onSuccess: () => {
      setSaveDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({ title: 'Коэффициенты обновлены', description: 'Теперь они будут использоваться при расчётах' })
    },
    onError: (err: Error) => {
      toast({ title: 'Ошибка сохранения', description: err.message, variant: 'destructive' })
    },
  })

  // ---- Обработчики ----
  const handleCalculate = useCallback(() => {
    if (!productId) {
      toast({ title: 'Ошибка', description: 'Выберите изделие', variant: 'destructive' })
      return
    }
    if (!fabricQty || parseFloat(fabricQty) <= 0) {
      toast({ title: 'Ошибка', description: 'Укажите количество ткани', variant: 'destructive' })
      return
    }
    calculateMutation.mutate({
      mode: 'calculate',
      productId,
      materialId: materialId || undefined,
      fabricQty: parseFloat(fabricQty),
      fabricUnit,
      sizeDistribution,
    })
  }, [productId, materialId, fabricQty, fabricUnit, sizeDistribution, calculateMutation, toast])

  const handleCalibrate = useCallback(() => {
    if (!productId) {
      toast({ title: 'Ошибка', description: 'Выберите изделие', variant: 'destructive' })
      return
    }
    if (!fabricQty || parseFloat(fabricQty) <= 0) {
      toast({ title: 'Ошибка', description: 'Укажите количество израсходованной ткани', variant: 'destructive' })
      return
    }
    const filledSizes = actualSizes.filter((s) => s.qty > 0)
    if (filledSizes.length === 0) {
      toast({ title: 'Ошибка', description: 'Укажите фактическое количество хотя бы по одному размеру', variant: 'destructive' })
      return
    }
    calculateMutation.mutate({
      mode: 'calibrate',
      productId,
      materialId: materialId || undefined,
      fabricQty: parseFloat(fabricQty),
      fabricUnit,
      actualSizes: filledSizes,
    })
  }, [productId, materialId, fabricQty, fabricUnit, actualSizes, calculateMutation, toast])

  const handleSaveCoeffs = useCallback(() => {
    if (!calibResult || !productId) return
    setPendingCoeffs(calibResult.suggestedCoeffs)
    setSaveDialogOpen(true)
  }, [calibResult, productId])

  const confirmSaveCoeffs = useCallback(() => {
    saveCoeffsMutation.mutate({ coeffs: pendingCoeffs, productId })
  }, [pendingCoeffs, productId, saveCoeffsMutation])

  const updateDistribution = useCallback((size: string, value: number) => {
    setSizeDistribution((prev) => prev.map((d) => (d.size === size ? { ...d, percentage: value } : d)))
  }, [])

  const updateActualQty = useCallback((size: string, qty: number) => {
    setActualSizes((prev) => prev.map((a) => (a.size === size ? { ...a, qty } : a)))
  }, [])

  // Сброс формы
  const handleReset = useCallback(() => {
    setProductId('')
    setMaterialId('')
    setFabricQty('')
    setFabricUnit('m')
    setCalcResult(null)
    setCalibResult(null)
    setSizeDistribution([])
    setActualSizes([])
  }, [])

  // ---- Загрузка ----
  if (productsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        <span className="ml-2 text-muted-foreground">Загрузка изделий...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 text-emerald-700 rounded-lg p-2">
            <Ruler className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Калькулятор ткани</h2>
            <p className="text-sm text-muted-foreground">Расчёт изделий из ткани и калибровка норм расхода</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Сбросить
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calculate" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Расчёт изделий
          </TabsTrigger>
          <TabsTrigger value="calibrate" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Калибровка нормы
          </TabsTrigger>
        </TabsList>

        {/* ========== РЕЖИМ 1: РАСЧЁТ ========== */}
        <TabsContent value="calculate" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-5 w-5 text-emerald-600" />
                Сколько изделий можно накроить?
              </CardTitle>
              <CardDescription>
                Укажите изделие, ткань и количество — калькулятор определит, сколько изделий каждого размера можно произвести
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Изделие */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Изделие</Label>
                  <Select value={productId} onValueChange={handleProductChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите изделие" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.article})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Материал */}
                {productId && normsForProduct.length > 0 && (
                  <div className="space-y-2">
                    <Label>Материал / Ткань</Label>
                    <Select value={materialId} onValueChange={setMaterialId}>
                      <SelectTrigger>
                        <SelectValue placeholder={normsForProduct.length === 1 ? normsForProduct[0].material?.name : 'Выберите материал'} />
                      </SelectTrigger>
                      <SelectContent>
                        {normsForProduct.map((n: any) => (
                          <SelectItem key={n.materialId} value={n.materialId}>
                            {n.material?.name || n.materialId} ({n.consumptionPerUnit} {n.unit}/шт)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Норма расхода */}
              {normsForProduct.length > 0 && productId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <Ruler className="h-4 w-4 shrink-0" />
                    <span className="font-medium">Норма расхода:</span>
                    {normsForProduct.length === 1 ? (
                      <span>
                        {normsForProduct[0].consumptionPerUnit} {normsForProduct[0].unit}/шт —{' '}
                        {normsForProduct[0].material?.name}
                      </span>
                    ) : materialId ? (
                      <span>
                        {normsForProduct.find((n: any) => n.materialId === materialId)?.consumptionPerUnit}{' '}
                        {normsForProduct.find((n: any) => n.materialId === materialId)?.unit}/шт —{' '}
                        {normsForProduct.find((n: any) => n.materialId === materialId)?.material?.name}
                      </span>
                    ) : (
                      <span>{normsForProduct.length} норм расхода — выберите материал</span>
                    )}
                  </div>
                </div>
              )}

              {productId && normsForProduct.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Норма расхода ткани не задана. Добавьте её в Справочниках → Прочее → Нормы расхода.</span>
                  </div>
                </div>
              )}

              {/* Складской остаток */}
              {materialId && materialStock && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-emerald-800">
                      <Warehouse className="h-4 w-4 shrink-0" />
                      <span className="font-medium">На складе:</span>
                      <span>{materialStock.totalQty} {materialStock.baseUnit}</span>
                      {selectedMaterialInfo?.ownershipType === 'customer' && (
                        <Badge variant="outline" className="text-xs">давальческая</Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                      onClick={fillFromStock}
                    >
                      <Package className="h-3 w-3 mr-1" />
                      Подставить
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              {/* Количество ткани */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Количество ткани</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={fabricQty}
                    onChange={(e) => setFabricQty(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Единица измерения</Label>
                  <Select value={fabricUnit} onValueChange={(v) => setFabricUnit(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="m">метры (м)</SelectItem>
                      <SelectItem value="pm">погонные метры (пм)</SelectItem>
                      <SelectItem value="kg">килограммы (кг)</SelectItem>
                      <SelectItem value="gr">граммы (гр)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Распределение по размерам */}
              {sizeDistribution.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Распределение по размерам</Label>
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Укажите долю каждого размера в общем объёме. Сумма должна быть 100%.</p>
                            <p className="mt-1">Коэффициент расхода показывает, насколько данный размер потребляет больше/меньше ткани относительно базового.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const equalPct = Math.floor(100 / sizeDistribution.length)
                          setSizeDistribution((prev) =>
                            prev.map((d, i) => ({
                              ...d,
                              percentage:
                                i === 0 ? equalPct + (100 - equalPct * prev.length) : equalPct,
                            })),
                          )
                        }}
                      >
                        Равномерно
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {sizeDistribution.map((d) => (
                      <div key={d.size} className="space-y-1.5 rounded-lg border bg-white p-2.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">{d.size}</Label>
                          {sizeRatesMap[d.size] !== undefined && sizeRatesMap[d.size] !== 1.0 && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              ×{sizeRatesMap[d.size].toFixed(2)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={d.percentage}
                            onChange={(e) => updateDistribution(d.size, parseInt(e.target.value) || 0)}
                            className="w-20 h-8 text-sm"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Итого:</span>
                    <Badge
                      variant={
                        sizeDistribution.reduce((s, d) => s + d.percentage, 0) === 100
                          ? 'default'
                          : 'destructive'
                      }
                    >
                      {sizeDistribution.reduce((s, d) => s + d.percentage, 0)}%
                    </Badge>
                  </div>
                </div>
              )}

              {/* Кнопка расчёта */}
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleCalculate}
                disabled={calculateMutation.isPending || !productId || normsForProduct.length === 0}
              >
                {calculateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calculator className="h-4 w-4 mr-2" />
                )}
                Рассчитать
              </Button>
            </CardContent>
          </Card>

          {/* Результат расчёта */}
          {calcResult && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Результат расчёта — {calcResult.product.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Сводка */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-700">{calcResult.totalQty}</div>
                    <div className="text-xs text-muted-foreground">Изделий всего</div>
                  </div>
                  <div className="bg-white rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold text-blue-700">
                      {calcResult.totalConsumption.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-xs text-muted-foreground">Расход ({calcResult.fabricUnit})</div>
                  </div>
                  <div className="bg-white rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold text-amber-700">
                      {calcResult.fabricRemaining.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-xs text-muted-foreground">Остаток ({calcResult.fabricUnit})</div>
                  </div>
                  <div className="bg-white rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold text-gray-700">
                      {calcResult.norm.consumptionPerUnit} {calcResult.norm.unit}
                    </div>
                    <div className="text-xs text-muted-foreground">Норма на 1 шт</div>
                  </div>
                </div>

                <Separator />

                {/* По размерам */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-white/50">
                        <th className="p-2 text-left font-medium">Размер</th>
                        <th className="p-2 text-right font-medium">Кол-во</th>
                        <th className="p-2 text-right font-medium">%</th>
                        <th className="p-2 text-right font-medium">Коэфф.</th>
                        <th className="p-2 text-right font-medium">Расход/шт</th>
                        <th className="p-2 text-right font-medium">Итого расход</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calcResult.sizes.map((s) => (
                        <tr key={s.size} className="border-b last:border-0 hover:bg-white/60">
                          <td className="p-2 font-medium">{s.size}</td>
                          <td className="p-2 text-right font-semibold">{s.qty}</td>
                          <td className="p-2 text-right text-muted-foreground">{s.percentage}%</td>
                          <td className="p-2 text-right text-muted-foreground">
                            {s.coeff !== 1.0 ? s.coeff.toFixed(2) : '—'}
                          </td>
                          <td className="p-2 text-right">
                            {s.consumptionPerUnit.toLocaleString('ru-RU')} {calcResult.fabricUnit}
                          </td>
                          <td className="p-2 text-right font-medium">
                            {s.totalConsumption.toLocaleString('ru-RU')} {calcResult.fabricUnit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Подсказка: остаток ткани */}
                {calcResult.fabricRemaining > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-amber-800">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>
                        Остаток {calcResult.fabricRemaining.toLocaleString('ru-RU')} {calcResult.fabricUnit} — 
                        этого хватит ещё примерно на{' '}
                        <strong>{Math.floor(calcResult.fabricRemaining / (calcResult.totalConsumption / calcResult.totalQty))} шт.</strong>
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== РЕЖИМ 2: КАЛИБРОВКА ========== */}
        <TabsContent value="calibrate" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-blue-600" />
                Определить реальный расход по факту раскроя
              </CardTitle>
              <CardDescription>
                Введите данные о фактическом раскрое (сколько ткани израсходовано и сколько изделий каждого размера получено), 
                чтобы узнать реальный расход ткани и откалибровать нормы для будущих расчётов.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Изделие */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Изделие</Label>
                  <Select value={productId} onValueChange={handleProductChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите изделие" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.article})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {productId && normsForProduct.length > 0 && (
                  <div className="space-y-2">
                    <Label>Материал / Ткань</Label>
                    <Select value={materialId} onValueChange={setMaterialId}>
                      <SelectTrigger>
                        <SelectValue placeholder={normsForProduct.length === 1 ? normsForProduct[0].material?.name : 'Выберите материал'} />
                      </SelectTrigger>
                      <SelectContent>
                        {normsForProduct.map((n: any) => (
                          <SelectItem key={n.materialId} value={n.materialId}>
                            {n.material?.name || n.materialId} ({n.consumptionPerUnit} {n.unit}/шт)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Норма расхода */}
              {normsForProduct.length > 0 && productId && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-blue-800">
                    <Ruler className="h-4 w-4 shrink-0" />
                    <span className="font-medium">Текущая норма:</span>
                    {normsForProduct.length === 1 ? (
                      <span>
                        {normsForProduct[0].consumptionPerUnit} {normsForProduct[0].unit}/шт —{' '}
                        {normsForProduct[0].material?.name}
                      </span>
                    ) : materialId ? (
                      <span>
                        {normsForProduct.find((n: any) => n.materialId === materialId)?.consumptionPerUnit}{' '}
                        {normsForProduct.find((n: any) => n.materialId === materialId)?.unit}/шт —{' '}
                        {normsForProduct.find((n: any) => n.materialId === materialId)?.material?.name}
                      </span>
                    ) : (
                      <span>{normsForProduct.length} норм расхода — выберите материал</span>
                    )}
                  </div>
                  {/* Показать текущие коэффициенты по размерам */}
                  {Object.keys(sizeRatesMap).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="text-xs text-blue-600">Коэффициенты:</span>
                      {Object.entries(sizeRatesMap).map(([size, coeff]) => (
                        <Badge key={size} variant="outline" className="text-[10px] px-1.5 py-0">
                          {size}: ×{coeff.toFixed(2)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {productId && normsForProduct.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>Норма расхода ткани не задана. Добавьте её в Справочниках → Прочее → Нормы расхода.</span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Израсходовано ткани */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Израсходовано ткани (всего)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={fabricQty}
                      onChange={(e) => setFabricQty(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Единица измерения</Label>
                    <Select value={fabricUnit} onValueChange={(v) => setFabricUnit(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m">метры (м)</SelectItem>
                        <SelectItem value="pm">погонные метры (пм)</SelectItem>
                        <SelectItem value="kg">килограммы (кг)</SelectItem>
                        <SelectItem value="gr">граммы (гр)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Подсказка — подставить из остатков */}
                {materialId && materialStock && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-emerald-700"
                      onClick={fillFromStock}
                    >
                      <Warehouse className="h-3 w-3 mr-1" />
                      Подставить со склада ({materialStock.totalQty} {materialStock.baseUnit})
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              {/* Фактическое количество по размерам */}
              {actualSizes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Фактическое количество по размерам</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Введите фактическое количество выкроенных изделий каждого размера из указанного количества ткани.</p>
                          <p className="mt-1">Калькулятор определит реальный расход на единицу и предложит обновлённые коэффициенты.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {actualSizes.map((a) => (
                      <div key={a.size} className="space-y-1.5 rounded-lg border bg-white p-2.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">{a.size}</Label>
                          {sizeRatesMap[a.size] !== undefined && sizeRatesMap[a.size] !== 1.0 && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              сейчас ×{sizeRatesMap[a.size].toFixed(2)}
                            </Badge>
                          )}
                        </div>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={a.qty || ''}
                          onChange={(e) => updateActualQty(a.size, parseInt(e.target.value) || 0)}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Всего изделий:</span>
                    <Badge variant="secondary">
                      {actualSizes.reduce((s, a) => s + a.qty, 0)} шт
                    </Badge>
                  </div>
                </div>
              )}

              {/* Кнопка калибровки */}
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleCalibrate}
                disabled={calculateMutation.isPending || !productId || normsForProduct.length === 0}
              >
                {calculateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FlaskConical className="h-4 w-4 mr-2" />
                )}
                Калибровать
              </Button>
            </CardContent>
          </Card>

          {/* Результат калибровки */}
          {calibResult && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  Результат калибровки — {calibResult.product.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Сводка */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold text-blue-700">{calibResult.totalActualQty}</div>
                    <div className="text-xs text-muted-foreground">Изделий всего</div>
                  </div>
                  <div className="bg-white rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold text-gray-700">
                      {calibResult.fabricQty.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-xs text-muted-foreground">Ткани ({calibResult.fabricUnit})</div>
                  </div>
                  <div className="bg-white rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-700">
                      {calibResult.avgConsumption.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-xs text-muted-foreground">Средний расход/шт</div>
                  </div>
                  <div className="bg-white rounded-lg border p-3 text-center">
                    <div className="text-2xl font-bold text-amber-700">
                      {calibResult.norm.consumptionPerUnit} {calibResult.norm.unit}
                    </div>
                    <div className="text-xs text-muted-foreground">Норма (была)</div>
                  </div>
                </div>

                {/* Сравнение: норма vs факт */}
                <div className="bg-white rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <span className="font-medium">Сравнение нормы и факта:</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Норма: {calibResult.norm.consumptionPerUnit} {calibResult.norm.unit}/шт</span>
                        <span>Факт: {calibResult.avgConsumption.toLocaleString('ru-RU')} {calibResult.fabricUnit}/шт</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        {(() => {
                          const normVal = calibResult.norm.consumptionPerUnit
                          const factVal = calibResult.avgConsumption
                          const maxVal = Math.max(normVal, factVal) * 1.2
                          return (
                            <div className="relative h-full">
                              <div
                                className="absolute top-0 left-0 h-full bg-blue-300 rounded-full"
                                style={{ width: `${(normVal / maxVal) * 100}%` }}
                              />
                              <div
                                className="absolute top-0 left-0 h-full bg-emerald-500 rounded-full opacity-70"
                                style={{ width: `${(factVal / maxVal) * 100}%` }}
                              />
                            </div>
                          )
                        })()}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-300 rounded-full inline-block" /> Норма
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block" /> Факт
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${calibResult.avgConsumption > calibResult.norm.consumptionPerUnit ? 'text-red-600' : 'text-emerald-600'}`}>
                        {((calibResult.avgConsumption / calibResult.norm.consumptionPerUnit - 1) * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {calibResult.avgConsumption > calibResult.norm.consumptionPerUnit ? 'перерасход' : 'экономия'}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* По размерам */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-white/50">
                        <th className="p-2 text-left font-medium">Размер</th>
                        <th className="p-2 text-right font-medium">Кол-во</th>
                        <th className="p-2 text-right font-medium">Реальный расход/шт</th>
                        <th className="p-2 text-right font-medium">Разница</th>
                        <th className="p-2 text-right font-medium">Отклонение</th>
                        <th className="p-2 text-right font-medium">Эфф. коэфф.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calibResult.sizes.map((s) => (
                        <tr key={s.size} className="border-b last:border-0 hover:bg-white/60">
                          <td className="p-2 font-medium">{s.size}</td>
                          <td className="p-2 text-right">{s.qty}</td>
                          <td className="p-2 text-right font-semibold">
                            {s.realConsumptionPerUnit.toLocaleString('ru-RU')} {calibResult.fabricUnit}
                          </td>
                          <td className="p-2 text-right">
                            <span
                              className={
                                s.diffWithNorm > 0 ? 'text-red-600' : s.diffWithNorm < 0 ? 'text-emerald-600' : ''
                              }
                            >
                              {s.diffWithNorm > 0 ? '+' : ''}
                              {s.diffWithNorm.toLocaleString('ru-RU')}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            <Badge
                              variant={Math.abs(s.diffPercent) > 10 ? 'destructive' : Math.abs(s.diffPercent) > 5 ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {s.diffPercent > 0 ? (
                                <TrendingUp className="h-3 w-3 mr-1" />
                              ) : s.diffPercent < 0 ? (
                                <TrendingDown className="h-3 w-3 mr-1" />
                              ) : null}
                              {s.diffPercent > 0 ? '+' : ''}
                              {s.diffPercent}%
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-medium">{s.effectiveCoeff.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Separator />

                {/* Предлагаемые коэффициенты */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Предлагаемые коэффициенты расхода</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      onClick={handleSaveCoeffs}
                      disabled={saveCoeffsMutation.isPending}
                    >
                      {saveCoeffsMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Сохранить коэффициенты
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {calibResult.suggestedCoeffs.map((c) => {
                      const prevSize = calibResult.sizes.find((s) => s.size === c.size)
                      const oldCoeff = sizeRatesMap[c.size] ?? 1.0
                      const coeffChanged = Math.abs(c.fabricCoeff - oldCoeff) > 0.001
                      return (
                        <div key={c.size} className={`rounded-lg border p-3 text-center ${coeffChanged ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
                          <div className="text-sm font-medium mb-1">{c.size}</div>
                          <div className="text-lg font-bold text-emerald-700">{c.fabricCoeff.toFixed(3)}</div>
                          {coeffChanged && (
                            <div className="text-xs text-amber-600 mt-1">
                              было ×{oldCoeff.toFixed(2)}
                            </div>
                          )}
                          {prevSize && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {prevSize.diffPercent > 0 ? '↑' : prevSize.diffPercent < 0 ? '↓' : '='}
                              {' '}
                              {Math.abs(prevSize.diffPercent)}% от нормы
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Диалог подтверждения сохранения коэффициентов */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Сохранить коэффициенты?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Новые коэффициенты расхода ткани будут сохранены для размеров этого изделия.
            Старые значения будут перезаписаны. Это повлияет на все будущие расчёты.
          </p>
          <div className="space-y-2 mt-2">
            {pendingCoeffs.map((c) => {
              const oldCoeff = sizeRatesMap[c.size] ?? 1.0
              const changed = Math.abs(c.fabricCoeff - oldCoeff) > 0.001
              return (
                <div key={c.size} className={`flex items-center justify-between text-sm rounded p-2 ${changed ? 'bg-amber-50 border border-amber-200' : 'bg-muted/50'}`}>
                  <span className="font-medium">{c.size}</span>
                  <div className="flex items-center gap-2">
                    {changed && (
                      <span className="text-xs text-muted-line-through text-muted-foreground">×{oldCoeff.toFixed(2)}</span>
                    )}
                    <Badge variant={changed ? 'default' : 'outline'}>×{c.fabricCoeff.toFixed(3)}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={confirmSaveCoeffs}
              disabled={saveCoeffsMutation.isPending}
            >
              {saveCoeffsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-1" />
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
