import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/seller-plans/available-items?customerId=xxx
 * Returns items that are ready for distribution (completed sewing tasks, passed QC)
 * grouped by productId + size + color, with total available quantity.
 * Subtracts quantities already distributed in existing seller plans.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json({ error: 'Укажите ID заказчика' }, { status: 400 })
    }

    // 1. Find all plans for this customer
    const customerPlans = await db.plan.findMany({
      where: { customerId },
      select: { id: true },
    })
    const planIds = customerPlans.map(p => p.id)

    if (planIds.length === 0) {
      return NextResponse.json([])
    }

    // 2. Find completed sewing tasks for these plans
    const completedTasks = await db.sewingTask.findMany({
      where: {
        status: 'completed',
        cuttingPlan: { planId: { in: planIds } },
      },
      include: {
        items: {
          select: {
            productId: true,
            size: true,
            color: true,
            colorHex: true,
            quantity: true,
            actualQuantity: true,
            fabricDefect: true,
            product: { select: { id: true, name: true, article: true } },
          },
        },
        cuttingPlan: {
          select: {
            planId: true,
            plan: { select: { id: true, name: true, customerId: true } },
          },
        },
      },
    })

    // 3. Aggregate available quantities by productId + size + color
    const aggregated: Record<string, {
      productId: string
      size: string
      color: string
      colorHex: string
      product: { id: string; name: string; article: string }
      totalQty: number
    }> = {}

    for (const task of completedTasks) {
      for (const item of task.items) {
        const key = `${item.productId}-${item.size}-${item.color}`
        const qty = (item.actualQuantity || item.quantity) - (item.fabricDefect || 0)

        if (qty <= 0) continue

        if (!aggregated[key]) {
          aggregated[key] = {
            productId: item.productId,
            size: item.size,
            color: item.color,
            colorHex: item.colorHex,
            product: item.product,
            totalQty: 0,
          }
        }
        aggregated[key].totalQty += qty
      }
    }

    // 4. Find already distributed quantities in seller plans for this customer
    const existingSellerPlans = await db.sellerPlan.findMany({
      where: { customerId },
      include: {
        items: {
          include: { cities: true },
        },
      },
    })

    const alreadyDistributed: Record<string, number> = {}
    for (const sp of existingSellerPlans) {
      for (const item of sp.items) {
        const key = `${item.productId}-${item.size}-${item.color}`
        // Sum of all city quantities = distributed amount
        const distributed = item.cities.reduce((sum, c) => sum + c.quantity, 0)
        if (!alreadyDistributed[key]) alreadyDistributed[key] = 0
        alreadyDistributed[key] += distributed
      }
    }

    // 5. Calculate available = total - already distributed
    const result = Object.values(aggregated).map(item => {
      const key = `${item.productId}-${item.size}-${item.color}`
      const distributed = alreadyDistributed[key] || 0
      const available = item.totalQty - distributed
      return {
        ...item,
        totalQty: item.totalQty,
        distributedQty: distributed,
        availableQty: Math.max(0, available),
      }
    }).filter(item => item.availableQty > 0)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get available items error:', error)
    return NextResponse.json({ error: 'Ошибка получения доступных изделий' }, { status: 500 })
  }
}
