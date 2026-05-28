import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cuttingPlan = await db.cuttingPlan.findUnique({
      where: { id },
      include: {
        plan: true,
        items: { include: { product: true } },
        sewingTasks: {
          include: {
            employee: true,
            items: { include: { product: true } },
          },
        },
        leftovers: {
          include: {
            product: true,
          },
        },
      },
    })
    if (!cuttingPlan) {
      return NextResponse.json({ error: 'План раскроя не найден' }, { status: 404 })
    }
    return NextResponse.json(cuttingPlan)
  } catch (error) {
    console.error('Get cutting plan error:', error)
    return NextResponse.json({ error: 'Ошибка получения плана раскроя' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, items } = body

    const existing = await db.cuttingPlan.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'План раскроя не найден' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status

    // Process items sequentially to avoid race conditions
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.id && item.actualQty !== undefined) {
          await db.cuttingPlanItem.update({
            where: { id: item.id },
            data: { actualQty: item.actualQty },
          })

          const existingItem = existing.items.find(i => i.id === item.id)
          if (!existingItem) continue

          if (item.actualQty > existingItem.plannedQty) {
            const surplus = item.actualQty - existingItem.plannedQty

            const existingLeftover = await db.cuttingLeftover.findFirst({
              where: { cuttingPlanItemId: item.id },
            })

            if (existingLeftover) {
              await db.cuttingLeftover.update({
                where: { id: existingLeftover.id },
                data: {
                  quantity: surplus,
                  status: surplus <= existingLeftover.sewnQty
                    ? 'fully_sewn'
                    : existingLeftover.sewnQty > 0
                      ? 'partially_sewn'
                      : 'free',
                },
              })
            } else {
              await db.cuttingLeftover.create({
                data: {
                  cuttingPlanId: id,
                  cuttingPlanItemId: item.id,
                  productId: existingItem.productId,
                  size: existingItem.size,
                  color: existingItem.color,
                  colorHex: existingItem.colorHex,
                  quantity: surplus,
                  sewnQty: 0,
                  status: 'free',
                  source: 'cutting',
                },
              })
            }
          } else if (item.actualQty <= existingItem.plannedQty) {
            await db.cuttingLeftover.deleteMany({
              where: { cuttingPlanItemId: item.id },
            })
          }
        }
      }
    }

    // Also auto-create leftovers when marking as "cut" for items where actualQty already > plannedQty
    if (status === 'cut') {
      // Re-fetch items to get latest actualQty
      const freshItems = await db.cuttingPlanItem.findMany({ where: { cuttingPlanId: id } })
      for (const item of freshItems) {
        if (item.actualQty && item.actualQty > item.plannedQty) {
          const existingLeftover = await db.cuttingLeftover.findFirst({
            where: { cuttingPlanItemId: item.id },
          })
          if (!existingLeftover) {
            await db.cuttingLeftover.create({
              data: {
                cuttingPlanId: id,
                cuttingPlanItemId: item.id,
                productId: item.productId,
                size: item.size,
                color: item.color,
                colorHex: item.colorHex,
                quantity: item.actualQty - item.plannedQty,
                sewnQty: 0,
                status: 'free',
                source: 'cutting',
              },
            })
          }
        }
      }
    }

    // Auto-deduct materials based on norms when status is set to "cut"
    if (status === 'cut') {
      // Guard: check if material entries already exist for this cutting plan to avoid duplicates
      const existingEntries = await db.materialEntry.findMany({
        where: { cuttingPlanId: id, type: 'consumed' },
      })

      if (existingEntries.length === 0) {
        // Get all cutting plan items with their quantities
        const freshItems = await db.cuttingPlanItem.findMany({ where: { cuttingPlanId: id } })

        // For each cutting plan item, find material norms and create consumed entries
        for (const item of freshItems) {
          const actualQty = item.actualQty ?? item.plannedQty

          // Find all material norms for this product
          const norms = await db.materialNorm.findMany({
            where: { productId: item.productId },
          })

          for (const norm of norms) {
            if (norm.consumptionPerUnit > 0) {
              const totalConsumed = norm.consumptionPerUnit * actualQty

              await db.materialEntry.create({
                data: {
                  materialId: norm.materialId,
                  type: 'consumed',
                  qty: totalConsumed,
                  cuttingPlanId: id,
                  note: `Автосписание: ${norm.unit} × ${actualQty} шт (норма: ${norm.consumptionPerUnit} ${norm.unit}/шт)`,
                },
              })

              // Update material totalQty
              await db.material.update({
                where: { id: norm.materialId },
                data: { totalQty: { decrement: totalConsumed } },
              })
            }
          }
        }
      }
    }

    const updated = await db.cuttingPlan.update({
      where: { id },
      data: updateData,
      include: {
        plan: true,
        items: { include: { product: true } },
        sewingTasks: {
          include: { employee: true },
        },
        leftovers: {
          include: { product: true },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update cutting plan error:', error)
    return NextResponse.json({ error: 'Ошибка обновления плана раскроя' }, { status: 500 })
  }
}
