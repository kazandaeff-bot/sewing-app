import { db } from '@/lib/db'
import { withAuth, validateBody, validateQuery } from '@/lib/api-auth'
import { CreateMaterialEntrySchema, MaterialEntriesQuerySchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withAuth(async (req, ctx, user) => {
  try {
    const q = validateQuery(req, MaterialEntriesQuerySchema)
    if ('error' in q) return q.error
    const { materialId, type, cuttingPlanId } = q.data

    const where: Record<string, unknown> = {}
    if (materialId) where.materialId = materialId
    if (type) where.type = type
    if (cuttingPlanId) where.cuttingPlanId = cuttingPlanId

    const entries = await db.materialEntry.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        material: {
          include: { materialType: true },
        },
      },
    })
    return NextResponse.json(entries)
  } catch (error) {
    console.error('Get material entries error:', error)
    return NextResponse.json({ error: 'Ошибка получения записей' }, { status: 500 })
  }
}, ['supervisor'])

export const POST = withAuth(async (req, ctx, user) => {
  try {
    const result = await validateBody(req, CreateMaterialEntrySchema)
    if ('error' in result) return result.error
    const { materialId, type, qty, inputQty, inputUnit, conversionRate, date, cuttingPlanId, note } = result.data

    // Verify material exists
    const material = await db.material.findUnique({ where: { id: materialId } })
    if (!material) {
      return NextResponse.json({ error: 'Материал не найден' }, { status: 404 })
    }

    // Calculate base unit quantity
    // If inputQty is provided with conversionRate, use it; otherwise use qty directly
    let baseQty = qty
    if (inputQty > 0 && conversionRate > 0) {
      baseQty = inputQty * conversionRate
    }

    // If consumed, check stock
    if (type === 'consumed' && material.totalQty < baseQty) {
      return NextResponse.json({
        error: `Недостаточно на складе. Доступно: ${material.totalQty} ${material.baseUnit}`
      }, { status: 400 })
    }

    // Create the entry
    const entry = await db.materialEntry.create({
      data: {
        materialId,
        type,
        qty: baseQty,
        inputQty: inputQty || baseQty,
        inputUnit: inputUnit || material.inputUnit,
        conversionRate,
        date: date ? new Date(date) : new Date(),
        cuttingPlanId: cuttingPlanId || null,
        note: note || null,
      },
    })

    // Update totalQty on the material
    const qtyChange = type === 'incoming' ? baseQty : -baseQty
    const updatedMaterial = await db.material.update({
      where: { id: materialId },
      data: { totalQty: material.totalQty + qtyChange },
    })

    // Auto-calculation: if this is a consumed entry linked to a cutting plan
    if (type === 'consumed' && cuttingPlanId) {
      try {
        await autoCalculateNorms(materialId, cuttingPlanId)
      } catch (calcError) {
        console.error('Auto-calculation error (non-blocking):', calcError)
      }
    }

    return NextResponse.json({
      ...entry,
      material: updatedMaterial,
    }, { status: 201 })
  } catch (error) {
    console.error('Create material entry error:', error)
    return NextResponse.json({ error: 'Ошибка создания записи' }, { status: 500 })
  }
}, ['supervisor'])

/**
 * Auto-calculate material consumption norms based on actual cutting data.
 */
async function autoCalculateNorms(materialId: string, cuttingPlanId: string) {
  const consumedEntries = await db.materialEntry.findMany({
    where: { materialId, type: 'consumed', cuttingPlanId },
  })

  if (consumedEntries.length === 0) return

  const totalConsumed = consumedEntries.reduce((sum, e) => sum + e.qty, 0)

  const cuttingPlanItems = await db.cuttingPlanItem.findMany({
    where: { cuttingPlanId, actualQty: { not: null } },
  })

  if (cuttingPlanItems.length === 0) return

  const totalActualQty = cuttingPlanItems.reduce((sum, item) => sum + (item.actualQty || 0), 0)
  if (totalActualQty === 0) return

  const consumptionPerUnit = totalConsumed / totalActualQty

  const material = await db.material.findUnique({ where: { id: materialId } })
  if (!material) return

  const productIds = [...new Set(cuttingPlanItems.map(item => item.productId))]

  for (const productId of productIds) {
    await db.materialNorm.upsert({
      where: { materialId_productId: { materialId, productId } },
      update: { consumptionPerUnit, autoCalculated: true, unit: material.baseUnit },
      create: { materialId, productId, consumptionPerUnit, unit: material.baseUnit, autoCalculated: true },
    })
  }
}
