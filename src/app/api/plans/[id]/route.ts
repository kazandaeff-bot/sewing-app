import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const plan = await db.plan.findUnique({
      where: { id },
      include: {
        items: { include: { product: { include: { sizes: true, colors: true } } } },
        cuttingPlan: { include: { items: { include: { product: true } } } },
      },
    })
    if (!plan) {
      return NextResponse.json({ error: 'План не найден' }, { status: 404 })
    }
    return NextResponse.json(plan)
  } catch (error) {
    console.error('Get plan error:', error)
    return NextResponse.json({ error: 'Ошибка получения плана' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, status, items } = body

    const existing = await db.plan.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'План не найден' }, { status: 404 })
    }

    // If status is changing to approved, auto-create cutting plan
    if (status === 'approved' && existing.status !== 'approved') {
      // Get current items with product info (for kit handling)
      const currentItems = items || (await db.planItem.findMany({
        where: { planId: id },
        include: { product: true }
      }))

      // Check if cutting plan already exists
      const existingCuttingPlan = await db.cuttingPlan.findUnique({ where: { planId: id } })

      if (!existingCuttingPlan) {
        // Update plan status
        await db.plan.update({
          where: { id },
          data: {
            status: 'approved',
            ...(name ? { name } : {}),
          },
        })

        // Build cutting plan items with kit expansion
        const cuttingItems: Array<{ productId: string; size: string; color: string; colorHex: string; plannedQty: number }> = []

        // Cache product data to avoid repeated queries
        const productCache: Record<string, { product: Awaited<ReturnType<typeof db.product.findUnique>>; colors: Array<{ color: string; colorHex: string }>; kitCombo: Record<string, string[]> | null }> = {}

        for (const item of currentItems) {
          const pid = item.productId

          // Load & cache product info
          if (!productCache[pid]) {
            const product = item.product || (await db.product.findUnique({ where: { id: pid } }))
            if (!product) continue
            const colors = await db.productColor.findMany({ where: { productId: pid } })
            let kitCombo: Record<string, string[]> | null = null
            if (product.isKit && product.kitComboColors) {
              try {
                kitCombo = typeof product.kitComboColors === 'string'
                  ? JSON.parse(product.kitComboColors)
                  : product.kitComboColors
              } catch { kitCombo = null }
            }
            productCache[pid] = { product, colors, kitCombo }
          }

          const cached = productCache[pid]
          if (!cached.product) continue

          const { colors: productColors, kitCombo } = cached

          // Check if item color is a kit combo key (e.g. "ч/б", "к/с")
          if (cached.product.isKit && kitCombo && kitCombo[item.color]) {
            // Expand kit combo into individual colors
            const expandedColors = kitCombo[item.color]
            for (const colorName of expandedColors) {
              const colorRecord = productColors.find(c =>
                c.color.toLowerCase() === colorName.toLowerCase()
              )
              cuttingItems.push({
                productId: pid,
                size: item.size,
                color: colorRecord?.color || colorName,
                colorHex: colorRecord?.colorHex || '#9ca3af',
                plannedQty: item.quantity,
              })
            }
          } else {
            // Normal item — single entry
            cuttingItems.push({
              productId: pid,
              size: item.size,
              color: item.color,
              colorHex: item.colorHex || '#9ca3af',
              plannedQty: item.quantity,
            })
          }
        }

        // SUM by productId + size + color to merge duplicates
        // (e.g. kit ч/б top 50 + individual black top 30 → black top 80)
        const sumMap = new Map<string, { productId: string; size: string; color: string; colorHex: string; plannedQty: number }>()
        for (const item of cuttingItems) {
          const key = `${item.productId}|${item.size}|${item.color}`
          if (sumMap.has(key)) {
            sumMap.get(key)!.plannedQty += item.plannedQty
          } else {
            sumMap.set(key, { ...item })
          }
        }
        const summedItems = Array.from(sumMap.values()).map(item => ({
          ...item,
          actualQty: null as null,
        }))

        // Create cutting plan with expanded & summed items
        await db.cuttingPlan.create({
          data: {
            planId: id,
            status: 'in_work',
            items: {
              create: summedItems,
            },
          },
        })

        // Re-fetch with cutting plan
        const result = await db.plan.findUnique({
          where: { id },
          include: {
            items: { include: { product: true } },
            cuttingPlan: { include: { items: { include: { product: true } } } },
          },
        })

        return NextResponse.json(result)
      }

      // Cutting plan already exists, just update status
      const updatedPlan = await db.plan.update({
        where: { id },
        data: { status: 'approved', ...(name ? { name } : {}) },
        include: {
          items: { include: { product: true } },
          cuttingPlan: { include: { items: { include: { product: true } } } },
        },
      })
      return NextResponse.json(updatedPlan)
    }

    // Regular update (name, items, or other status changes)
    const updateData: Record<string, unknown> = {}
    if (name) updateData.name = name
    if (status) updateData.status = status

    // If items are provided, replace them
    if (items && Array.isArray(items)) {
      await db.planItem.deleteMany({ where: { planId: id } })
      updateData.items = {
        create: items.map((item: { productId: string; size: string; color: string; colorHex?: string; quantity: number }) => ({
          productId: item.productId,
          size: item.size,
          color: item.color,
          colorHex: item.colorHex || '#9ca3af',
          quantity: item.quantity,
        })),
      }
    }

    const updatedPlan = await db.plan.update({
      where: { id },
      data: updateData,
      include: {
        items: { include: { product: true } },
        cuttingPlan: { include: { items: { include: { product: true } } } },
      },
    })

    // If plan is approved and items changed, also update cutting plan
    if (existing.status === 'approved' && items && Array.isArray(items)) {
      const cuttingPlan = await db.cuttingPlan.findUnique({ where: { planId: id } })
      if (cuttingPlan) {
        const productCache: Record<string, { product: Awaited<ReturnType<typeof db.product.findUnique>>; colors: Array<{ color: string; colorHex: string }>; kitCombo: Record<string, string[]> | null }> = {}
        const cuttingItems: Array<{ productId: string; size: string; color: string; colorHex: string; plannedQty: number }> = []

        for (const item of items) {
          const pid = item.productId
          if (!productCache[pid]) {
            const product = await db.product.findUnique({ where: { id: pid } })
            if (!product) continue
            const colors = await db.productColor.findMany({ where: { productId: pid } })
            let kitCombo: Record<string, string[]> | null = null
            if (product.isKit && product.kitComboColors) {
              try {
                kitCombo = typeof product.kitComboColors === 'string'
                  ? JSON.parse(product.kitComboColors)
                  : product.kitComboColors
              } catch { kitCombo = null }
            }
            productCache[pid] = { product, colors, kitCombo }
          }

          const cached = productCache[pid]
          if (!cached.product) continue

          if (cached.product.isKit && cached.kitCombo && cached.kitCombo[item.color]) {
            const expandedColors = cached.kitCombo[item.color]
            for (const colorName of expandedColors) {
              const colorRecord = cached.colors.find(c =>
                c.color.toLowerCase() === colorName.toLowerCase()
              )
              cuttingItems.push({
                productId: pid,
                size: item.size,
                color: colorRecord?.color || colorName,
                colorHex: colorRecord?.colorHex || '#9ca3af',
                plannedQty: item.quantity,
              })
            }
          } else {
            cuttingItems.push({
              productId: pid,
              size: item.size,
              color: item.color,
              colorHex: item.colorHex || '#9ca3af',
              plannedQty: item.quantity,
            })
          }
        }

        // Sum by productId + size + color
        const sumMap = new Map<string, { productId: string; size: string; color: string; colorHex: string; plannedQty: number }>()
        for (const item of cuttingItems) {
          const key = `${item.productId}|${item.size}|${item.color}`
          if (sumMap.has(key)) {
            sumMap.get(key)!.plannedQty += item.plannedQty
          } else {
            sumMap.set(key, { ...item })
          }
        }
        const summedItems = Array.from(sumMap.values())

        // Delete old cutting plan items and recreate
        await db.cuttingPlanItem.deleteMany({ where: { cuttingPlanId: cuttingPlan.id } })
        await db.cuttingPlanItem.createMany({
          data: summedItems.map(item => ({
            cuttingPlanId: cuttingPlan.id,
            productId: item.productId,
            size: item.size,
            color: item.color,
            colorHex: item.colorHex,
            plannedQty: item.plannedQty,
            actualQty: null,
          })),
        })
      }
    }

    return NextResponse.json(updatedPlan)
  } catch (error) {
    console.error('Update plan error:', error)
    return NextResponse.json({ error: 'Ошибка обновления плана' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.plan.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'План не найден' }, { status: 404 })
    }

    await db.plan.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete plan error:', error)
    return NextResponse.json({ error: 'Ошибка удаления плана' }, { status: 500 })
  }
}