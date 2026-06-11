import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { z } from 'zod'

// ============ КАЛЬКУЛЯТОР ТКАНИ ============
// Два режима:
// 1. "calculate" — сколько изделий можно накроить из имеющейся ткани
// 2. "calibrate" — определить реальный расход по фактическим данным

const CalculateSchema = z.object({
  mode: z.enum(['calculate', 'calibrate']),
  productId: z.string().min(1),
  materialId: z.string().min(1).optional(), // если не указан — берём первую норму
  fabricQty: z.coerce.number().positive('Количество ткани должно быть > 0'),
  fabricUnit: z.enum(['m', 'kg', 'gr', 'pm']).default('m'), // единица измерения ткани
  // Для расчёта: проценты распределения по размерам
  sizeDistribution: z.array(z.object({
    size: z.string().min(1),
    percentage: z.coerce.number().min(0).max(100).default(0), // % от общего кол-ва
  })).optional(),
  // Для калибровки: фактическое кол-во по размерам
  actualSizes: z.array(z.object({
    size: z.string().min(1),
    qty: z.coerce.number().int().nonnegative(),
  })).optional(),
})

export const POST = withAuth(async (req, ctx, _user) => {
  try {
    const body = await req.json()
    const result = CalculateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Неверные данные', details: result.error.issues }, { status: 400 })
    }
    const { mode, productId, materialId, fabricQty, fabricUnit, sizeDistribution, actualSizes } = result.data

    // Получаем изделие с размерами и нормами расхода
    const product = await db.product.findUnique({
      where: { id: productId },
      include: {
        sizes: { orderBy: { order: 'asc' } },
        materialNorms: { include: { material: true } },
        sizeRates: true,
      },
    })
    if (!product) {
      return NextResponse.json({ error: 'Изделие не найдено' }, { status: 404 })
    }

    // Находим норму расхода
    let norm = materialId
      ? product.materialNorms.find(n => n.materialId === materialId)
      : product.materialNorms[0]

    if (!norm) {
      return NextResponse.json({ error: 'Норма расхода ткани не задана для этого изделия. Добавьте норму в карточке изделия.' }, { status: 400 })
    }

    const baseConsumption = norm.consumptionPerUnit // расход на 1 изделие (базовый размер)
    const normUnit = norm.unit // гр, м, и т.д.

    // Получаем коэффициенты по размерам
    const coeffMap: Record<string, number> = {}
    product.sizeRates.forEach(sr => {
      coeffMap[sr.size] = sr.fabricCoeff ?? 1.0
    })

    // Конвертируем количество ткани в единицы нормы
    let fabricInNormUnit = fabricQty
    if (fabricUnit === 'kg' && normUnit === 'гр') {
      fabricInNormUnit = fabricQty * 1000 // кг → гр
    } else if (fabricUnit === 'gr' && normUnit === 'кг') {
      fabricInNormUnit = fabricQty / 1000 // гр → кг
    } else if (fabricUnit === 'pm' && normUnit === 'м') {
      fabricInNormUnit = fabricQty // пог.м ≈ м
    }

    if (mode === 'calculate') {
      // ========== РАСЧЁТ: сколько изделий можно накроить ==========
      const sizes = product.sizes.map(s => s.size)
      
      // Определяем распределение по размерам
      let distribution: Record<string, number> = {}
      
      if (sizeDistribution && sizeDistribution.length > 0) {
        // Пользователь задал проценты
        sizeDistribution.forEach(d => { distribution[d.size] = d.percentage })
      } else {
        // Равномерное распределение по умолчанию
        const equalPct = Math.floor(100 / sizes.length)
        sizes.forEach((s, i) => {
          distribution[s] = i === 0 ? equalPct + (100 - equalPct * sizes.length) : equalPct
        })
      }

      // Считаем средневзвешенный расход на 1 изделие с учётом распределения и коэффициентов
      let weightedConsumption = 0
      sizes.forEach(s => {
        const pct = (distribution[s] || 0) / 100
        const coeff = coeffMap[s] ?? 1.0
        weightedConsumption += pct * baseConsumption * coeff
      })

      if (weightedConsumption === 0) {
        return NextResponse.json({ error: 'Задайте распределение по размерам' }, { status: 400 })
      }

      // Общее кол-во изделий
      const totalQty = Math.floor(fabricInNormUnit / weightedConsumption)

      // Распределяем по размерам
      const sizeResults = sizes.map(s => {
        const pct = (distribution[s] || 0) / 100
        const coeff = coeffMap[s] ?? 1.0
        const qty = Math.floor(totalQty * pct)
        const consumption = qty * baseConsumption * coeff
        return {
          size: s,
          qty,
          percentage: distribution[s] || 0,
          coeff,
          consumptionPerUnit: +(baseConsumption * coeff).toFixed(2),
          totalConsumption: +consumption.toFixed(2),
        }
      })

      // Общий расход
      const totalConsumption = sizeResults.reduce((sum, r) => sum + r.totalConsumption, 0)
      const fabricRemaining = +(fabricInNormUnit - totalConsumption).toFixed(2)

      return NextResponse.json({
        mode: 'calculate',
        product: { id: product.id, name: product.name, article: product.article },
        material: { id: norm.material.id, name: norm.material.name },
        norm: { consumptionPerUnit: baseConsumption, unit: normUnit },
        fabricQty: fabricInNormUnit,
        fabricUnit: normUnit,
        totalQty,
        totalConsumption: +totalConsumption.toFixed(2),
        fabricRemaining,
        sizes: sizeResults,
      })

    } else {
      // ========== КАЛИБРОВКА: определить реальный расход ==========
      if (!actualSizes || actualSizes.length === 0) {
        return NextResponse.json({ error: 'Укажите фактическое количество по размерам' }, { status: 400 })
      }

      const totalActualQty = actualSizes.reduce((sum, s) => sum + s.qty, 0)
      if (totalActualQty === 0) {
        return NextResponse.json({ error: 'Общее количество изделий должно быть > 0' }, { status: 400 })
      }

      // Средний расход на 1 изделие (общий)
      const avgConsumption = fabricInNormUnit / totalActualQty

      // Считаем расход по размерам с учётом коэффициентов
      // Формула: totalFabric = Σ(qty_i × coeff_i × X) → X = totalFabric / Σ(qty_i × coeff_i)
      let weightedSum = 0
      actualSizes.forEach(s => {
        const coeff = coeffMap[s.size] ?? 1.0
        weightedSum += s.qty * coeff
      })

      const baseX = fabricInNormUnit / weightedSum // базовый расход (для coeff=1.0)

      const sizeResults = actualSizes.map(s => {
        const coeff = coeffMap[s.size] ?? 1.0
        const realConsumptionPerUnit = baseX * coeff
        const totalConsumption = s.qty * realConsumptionPerUnit
        // Эффективный коэффициент (если разделить на базовую норму из справочника)
        const effectiveCoeff = baseConsumption > 0 ? realConsumptionPerUnit / baseConsumption : coeff
        return {
          size: s.size,
          qty: s.qty,
          coeff,
          realConsumptionPerUnit: +realConsumptionPerUnit.toFixed(2),
          totalConsumption: +totalConsumption.toFixed(2),
          effectiveCoeff: +effectiveCoeff.toFixed(3),
          // Разница с нормой
          diffWithNorm: +((realConsumptionPerUnit - baseConsumption * coeff)).toFixed(2),
          diffPercent: baseConsumption * coeff > 0
            ? +(((realConsumptionPerUnit / (baseConsumption * coeff)) - 1) * 100).toFixed(1)
            : 0,
        }
      })

      const totalCalculated = sizeResults.reduce((sum, r) => sum + r.totalConsumption, 0)

      return NextResponse.json({
        mode: 'calibrate',
        product: { id: product.id, name: product.name, article: product.article },
        material: { id: norm.material.id, name: norm.material.name },
        norm: { consumptionPerUnit: baseConsumption, unit: normUnit },
        fabricQty: fabricInNormUnit,
        fabricUnit: normUnit,
        totalActualQty,
        avgConsumption: +avgConsumption.toFixed(2),
        totalCalculated: +totalCalculated.toFixed(2),
        sizes: sizeResults,
        // Можно сохранить как новые коэффициенты
        suggestedCoeffs: sizeResults.map(r => ({
          size: r.size,
          fabricCoeff: r.effectiveCoeff,
        })),
      })
    }

  } catch (error) {
    console.error('Fabric calculator error:', error)
    return NextResponse.json({ error: 'Ошибка калькулятора ткани' }, { status: 500 })
  }
}, ['supervisor'])
