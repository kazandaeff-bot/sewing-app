'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Loader2,
  Calculator,
  FlaskConical,
  Ruler,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertTriangle,
  Save,
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

  // ---- Общие параметры ----
  const [productId, setProductId] = useState('')
  const [materialId, setMaterialId] = useState('')
  const [fabricQty, setFabricQty] = useState('')
  const [fabricUnit, setFabricUnit] = useState<'m' | 'kg' | 'gr' | 'pm'>('m')

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

  const productNorms = useMemo(() => {
    if (!selectedProduct) return []
    return (selectedProduct as any).materialNorms || []
  }, [selectedProduct])

  // Материалы для выпадающего списка
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

  // Размеры изделия
  const productSizes = useMemo(() => {
    if (!selectedProduct) return []
    return (selectedProduct as any).sizes?.map((s: any) => s.size) || []
  }, [selectedProduct])

  // Автообновление распределения по размерам при смене изделия
  const handleProductChange = useCallback(
    (id: string) => {
      setProductId(id)
      setMaterialId('')
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

  // ---- Мутация: сохранить коэффициенты ----
  const saveCoeffsMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      authFetchJson(`/api/product-size-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setSaveDialogOpen(false)
      toast({ title: 'Коэффициенты обновлены' })
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
    // Сохраняем каждый коэффициент через API
    for (const coeff of pendingCoeffs) {
      saveCoeffsMutation.mutate({
        id: coeff.size,
        data: {
          productId,
          size: coeff.size,
          fabricCoeff: coeff.fabricCoeff,
        },
      })
    }
  }, [pendingCoeffs, productId, saveCoeffsMutation])

  const updateDistribution = useCallback((size: string, value: number) => {
    setSizeDistribution((prev) => prev.map((d) => (d.size === size ? { ...d, percentage: value } : d)))
  }, [])

  const updateActualQty = useCallback((size: string, qty: number) => {
    setActualSizes((prev) => prev.map((a) => (a.size === size ? { ...a, qty } : a)))
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
      <div className="flex items-center gap-3">
        <div className="bg-emerald-100 text-emerald-700 rounded-lg p-2">
          <Ruler className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Калькулятор ткани</h2>
          <p className="text-sm text-muted-foreground">Расчёт изделий из ткани и калибровка норм расхода</p>
        </div>
      </div>

      <Tabs defaultValue="calculate" className="w-full">
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

                {/* Материал (если несколько норм) */}
                {normsForProduct.length > 1 && (
                  <div className="space-y-2">
                    <Label>Материал / Ткань</Label>
                    <Select value={materialId} onValueChange={setMaterialId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите материал" />
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
                    <Ruler className="h-4 w-4" />
                    <span className="font-medium">Норма расхода:</span>
                    {normsForProduct.length === 1 ? (
                      <span>
                        {normsForProduct[0].consumptionPerUnit} {normsForProduct[0].unit}/шт —{' '}
                        {normsForProduct[0].material?.name}
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
                    <AlertTriangle className="h-4 w-4" />
                    <span>Норма расхода ткани не задана. Добавьте её в Справочниках → Нормы расхода.</span>
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {sizeDistribution.map((d) => (
                      <div key={d.size} className="space-y-1">
                        <Label className="text-sm">{d.size}</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={d.percentage}
                            onChange={(e) => updateDistribution(d.size, parseInt(e.target.value) || 0)}
                            className="w-20"
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
                  Результат расчёта
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
                      <tr className="border-b">
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
              <p className="text-sm text-muted-foreground">
                Введите данные о фактическом раскрое, чтобы узнать реальный расход ткани и
                откалибровать нормы.
              </p>
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

                {normsForProduct.length > 1 && (
                  <div className="space-y-2">
                    <Label>Материал / Ткань</Label>
                    <Select value={materialId} onValueChange={setMaterialId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите материал" />
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
                    <Ruler className="h-4 w-4" />
                    <span className="font-medium">Текущая норма:</span>
                    {normsForProduct.length === 1 ? (
                      <span>
                        {normsForProduct[0].consumptionPerUnit} {normsForProduct[0].unit}/шт —{' '}
                        {normsForProduct[0].material?.name}
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
                    <AlertTriangle className="h-4 w-4" />
                    <span>Норма расхода ткани не задана. Добавьте её в Справочниках → Нормы расхода.</span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Израсходовано ткани */}
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

              <Separator />

              {/* Фактическое количество по размерам */}
              {actualSizes.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">Фактическое количество по размерам</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {actualSizes.map((a) => (
                      <div key={a.size} className="space-y-1">
                        <Label className="text-sm">{a.size}</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={a.qty || ''}
                          onChange={(e) => updateActualQty(a.size, parseInt(e.target.value) || 0)}
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
                  Результат калибровки
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

                <Separator />

                {/* По размерам */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
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
                              variant={Math.abs(s.diffPercent) > 10 ? 'destructive' : 'secondary'}
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
                      return (
                        <div key={c.size} className="bg-white rounded-lg border p-3 text-center">
                          <div className="text-sm font-medium mb-1">{c.size}</div>
                          <div className="text-lg font-bold text-emerald-700">{c.fabricCoeff.toFixed(3)}</div>
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
            Старые значения будут перезаписаны.
          </p>
          <div className="space-y-2 mt-2">
            {pendingCoeffs.map((c) => (
              <div key={c.size} className="flex items-center justify-between text-sm bg-muted/50 rounded p-2">
                <span className="font-medium">{c.size}</span>
                <Badge variant="outline">fabricCoeff = {c.fabricCoeff.toFixed(3)}</Badge>
              </div>
            ))}
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
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
