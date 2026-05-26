import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const materialId = searchParams.get('materialId')
    const type = searchParams.get('type')
    const cuttingPlanId = searchParams.get('cuttingPlanId')

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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { materialId, type, qty, date, cuttingPlanId, note } = body

    if (!materialId) {
      return NextResponse.json({ error: 'Укажите материал' }, { status: 400 })
    }
    if (!type || !['incoming', 'consumed'].includes(type)) {
      return NextResponse.json({ error: 'Тип записи должен быть incoming или consumed' }, { status: 400 })
    }
    if (!qty || qty <= 0) {
      return NextResponse.json({ error: 'Количество должно быть больше 0' }, { status: 400 })
    }

    // Verify material exists
    const material = await db.material.findUnique({ where: { id: materialId } })
    if (!material) {
      return NextResponse.json({ error: 'Материал не найден' }, { status: 404 })
    }

    // If consumed, check stock
    if (type === 'consumed' && material.totalQty < qty) {
      return NextResponse.json({ error: `Недостаточно на складе. Доступно: ${material.totalQty} ${material.unit}` }, { status: 400 })
    }

    // Create the entry
    const entry = await db.materialEntry.create({
      data: {
        materialId,
        type,
        qty,
        date: date ? new Date(date) : new Date(),
        cuttingPlanId: cuttingPlanId || null,
        note: note || null,
      },
    })

    // Update totalQty on the material
    const qtyChange = type === 'incoming' ? qty : -qty
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
        // Don't fail the entry creation if auto-calc fails
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
}

/**
 * Auto-calculate material consumption norms based on actual cutting data.
 * 
 * Logic:
 * 1. Find all consumed entries for this material + cutting plan
 * 2. Find the total actualQty from cutting plan items
 * 3. Calculate average consumption per unit = total consumed / total actualQty
 * 4. Update all MaterialNorm records for this material + products in the cutting plan
 */
async function autoCalculateNorms(materialId: string, cuttingPlanId: string) {
  // 1. Get all consumed entries for this material + cutting plan
  const consumedEntries = await db.materialEntry.findMany({
    where: {
      materialId,
      type: 'consumed',
      cuttingPlanId,
    },
  })

  if (consumedEntries.length === 0) return

  const totalConsumed = consumedEntries.reduce((sum, e) => sum + e.qty, 0)

  // 2. Get cutting plan items with actualQty filled in
  const cuttingPlanItems = await db.cuttingPlanItem.findMany({
    where: {
      cuttingPlanId,
      actualQty: { not: null },
    },
  })

  if (cuttingPlanItems.length === 0) return

  const totalActualQty = cuttingPlanItems.reduce((sum, item) => sum + (item.actualQty || 0), 0)
  if (totalActualQty === 0) return

  // 3. Calculate average consumption per unit
  const consumptionPerUnit = totalConsumed / totalActualQty

  // Get the material to know its unit
  const material = await db.material.findUnique({ where: { id: materialId } })
  if (!material) return

  // 4. Get unique product IDs from cutting plan
  const productIds = [...new Set(cuttingPlanItems.map(item => item.productId))]

  // Update or create norms for each product
  for (const productId of productIds) {
    await db.materialNorm.upsert({
      where: {
        materialId_productId: { materialId, productId },
      },
      update: {
        consumptionPerUnit,
        autoCalculated: true,
        unit: material.unit,
      },
      create: {
        materialId,
        productId,
        consumptionPerUnit,
        unit: material.unit,
        autoCalculated: true,
      },
    })
  }
}
