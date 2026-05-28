import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Helper: build cutting plan items with kit expansion
 */
async function buildCuttingItems(planItems: Array<{ productId: string; size: string; color: string; colorHex: string; quantity: number; product?: any }>) {
  const cuttingItems: Array<{ productId: string; size: string; color: string; colorHex: string; plannedQty: number }> = []
  const productCache: Record<string, { product: Awaited<ReturnType<typeof db.product.findUnique>>; colors: Array<{ color: string; colorHex: string }>; kitCombo: Record<string, string[]> | null }> = {}

  for (const item of planItems) {
    const pid = item.productId

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

    if (cached.product.isKit && kitCombo && kitCombo[item.color]) {
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
  const sumMap = new Map<string, { productId: string; size: string; color: string; colorHex: string; plannedQty: number }>()
  for (const item of cuttingItems) {
    const key = `${item.productId}|${item.size}|${item.color}`
    if (sumMap.has(key)) {
      sumMap.get(key)!.plannedQty += item.plannedQty
    } else {
      sumMap.set(key, { ...item })
    }
  }

  return Array.from(sumMap.values()).map(item => ({
    ...item,
    actualQty: null as null,
  }))
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const plan = await db.plan.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
        items: { include: { product: { include: { sizes: true, colors: true } } } },
        cuttingPlans: {
          include: {
            items: { include: { product: true } },
            sewingTasks: {
              include: {
                employee: true,
                items: { include: { product: true } },
              },
            },
          },
        },
      },
    })
    if (!plan) {
      return NextResponse.json({ error: 'План не найден' }, { status: 404 })
    }

    // Compute progress per plan item
    const planItemProgress = plan.items.map(planItem => {
      // Find all cutting plan items matching this plan item
      const matchingCuttingItems = plan.cuttingPlans.flatMap(cp =>
        cp.items.filter(cpi =>
          cpi.productId === planItem.productId &&
          cpi.size === planItem.size &&
          cpi.color === planItem.color
        )
      )

      const totalPlanned = planItem.quantity
      const totalCut = matchingCuttingItems.reduce((sum, cpi) => sum + (cpi.actualQty ?? cpi.plannedQty), 0)

      // Find all sewing task items matching this plan item
      const matchingSewingItems = plan.cuttingPlans.flatMap(cp =>
        cp.sewingTasks.flatMap(st =>
          st.items.filter(sti =>
            sti.productId === planItem.productId &&
            sti.size === planItem.size &&
            sti.color === planItem.color
          )
        )
      )

      const assignedToSewers = matchingSewingItems.reduce((sum, sti) => sum + sti.quantity, 0)
      const sewnQty = matchingSewingItems
        .filter(sti => ['pending_ironing', 'ironed', 'pending_qc', 'completed'].includes(sti.status))
        .reduce((sum, sti) => sum + (sti.actualQuantity ?? sti.quantity), 0)
      const checkedQty = matchingSewingItems
        .filter(sti => sti.status === 'completed')
        .reduce((sum, sti) => sum + (sti.actualQuantity ?? sti.quantity), 0)

      return {
        planItemId: planItem.id,
        productId: planItem.productId,
        productName: planItem.product.name,
        size: planItem.size,
        color: planItem.color,
        colorHex: planItem.colorHex,
        totalPlanned,
        totalCut,
        assignedToSewers,
        sewnQty,
        checkedQty,
      }
    })

    // Compute overall progress
    const totalAllPlanned = planItemProgress.reduce((s, p) => s + p.totalPlanned, 0)
    const totalAllCut = planItemProgress.reduce((s, p) => s + p.totalCut, 0)
    const totalAllAssigned = planItemProgress.reduce((s, p) => s + p.assignedToSewers, 0)
    const totalAllSewn = planItemProgress.reduce((s, p) => s + p.sewnQty, 0)
    const totalAllChecked = planItemProgress.reduce((s, p) => s + p.checkedQty, 0)

    return NextResponse.json({
      ...plan,
      progress: {
        items: planItemProgress,
        total: {
          planned: totalAllPlanned,
          cut: totalAllCut,
          assigned: totalAllAssigned,
          sewn: totalAllSewn,
          checked: totalAllChecked,
          sewnPercent: totalAllPlanned > 0 ? Math.round((totalAllSewn / totalAllPlanned) * 100) : 0,
          checkedPercent: totalAllPlanned > 0 ? Math.round((totalAllChecked / totalAllPlanned) * 100) : 0,
        },
      },
    })
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
    const { name, status, items, addItems, priority, deadline } = body

    const existing = await db.plan.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        cuttingPlans: true,
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'План не найден' }, { status: 404 })
    }

    // ========== RETURN TO DRAFT ==========
    if (status === 'draft' && existing.status === 'approved') {
      // Only allow return to draft if no cutting plans are cut
      const hasCutPlan = existing.cuttingPlans.some(cp => cp.status === 'cut')
      if (hasCutPlan) {
        return NextResponse.json({ error: 'Нельзя вернуть в черновик: план уже раскроен' }, { status: 400 })
      }

      // Delete all cutting plans (they were in_work, not cut yet)
      for (const cp of existing.cuttingPlans) {
        await db.cuttingLeftover.deleteMany({ where: { cuttingPlanId: cp.id } })
        await db.cuttingPlanItem.deleteMany({ where: { cuttingPlanId: cp.id } })
        await db.cuttingPlan.delete({ where: { id: cp.id } })
      }

      const updatedPlan = await db.plan.update({
        where: { id },
        data: { status: 'draft' },
        include: {
          customer: { select: { id: true, name: true } },
          items: { include: { product: true } },
          cuttingPlans: { include: { items: { include: { product: true } } } },
        },
      })
      return NextResponse.json(updatedPlan)
    }

    // ========== ADD ITEMS TO EXISTING PLAN (supplementary) ==========
    if (addItems && Array.isArray(addItems) && addItems.length > 0) {
      // Add new items to the plan (works for any status)
      const newPlanItems = addItems.map((item: { productId: string; size: string; color: string; colorHex?: string; quantity: number }) => ({
        productId: item.productId,
        size: item.size,
        color: item.color,
        colorHex: item.colorHex || '#9ca3af',
        quantity: item.quantity,
      }))

      await db.planItem.createMany({
        data: newPlanItems.map(item => ({ ...item, planId: id })),
      })

      // If plan has cutting plans (already cut or in_work), create a supplementary cutting plan
      if (existing.cuttingPlans.length > 0) {
        // Build cutting items from the new plan items (with kit expansion)
        const newItemsWithProduct = await db.planItem.findMany({
          where: { planId: id, id: { notIn: existing.items.map(i => i.id) } },
          include: { product: true },
        })

        const cuttingItems = await buildCuttingItems(
          newItemsWithProduct.map(i => ({
            productId: i.productId,
            size: i.size,
            color: i.color,
            colorHex: i.colorHex,
            quantity: i.quantity,
            product: i.product,
          }))
        )

        if (cuttingItems.length > 0) {
          // Count existing cutting plans to generate label
          const cuttingPlanCount = existing.cuttingPlans.length
          const label = cuttingPlanCount === 0 ? 'Основной' : `Дополнение ${cuttingPlanCount}`

          await db.cuttingPlan.create({
            data: {
              planId: id,
              label,
              status: 'in_work',
              items: { create: cuttingItems },
            },
          })
        }
      }

      const updatedPlan = await db.plan.findUnique({
        where: { id },
        include: {
          customer: { select: { id: true, name: true } },
          items: { include: { product: true } },
          cuttingPlans: { include: { items: { include: { product: true } } } },
        },
      })
      return NextResponse.json(updatedPlan)
    }

    // ========== APPROVE: auto-create cutting plan ==========
    if (status === 'approved' && existing.status !== 'approved') {
      const currentItems = items || existing.items

      const existingCuttingPlan = await db.cuttingPlan.findFirst({ where: { planId: id } })

      if (!existingCuttingPlan) {
        await db.plan.update({
          where: { id },
          data: { status: 'approved', ...(name ? { name } : {}) },
        })

        const cuttingItems = await buildCuttingItems(
          currentItems.map((item: any) => ({
            productId: item.productId,
            size: item.size,
            color: item.color,
            colorHex: item.colorHex,
            quantity: item.quantity,
            product: item.product,
          }))
        )

        await db.cuttingPlan.create({
          data: {
            planId: id,
            label: 'Основной',
            status: 'in_work',
            items: { create: cuttingItems },
          },
        })

        const result = await db.plan.findUnique({
          where: { id },
          include: {
            customer: { select: { id: true, name: true } },
            items: { include: { product: true } },
            cuttingPlans: { include: { items: { include: { product: true } } } },
          },
        })
        return NextResponse.json(result)
      }

      const updatedPlan = await db.plan.update({
        where: { id },
        data: { status: 'approved', ...(name ? { name } : {}) },
        include: {
          customer: { select: { id: true, name: true } },
          items: { include: { product: true } },
          cuttingPlans: { include: { items: { include: { product: true } } } },
        },
      })
      return NextResponse.json(updatedPlan)
    }

    // ========== REGULAR UPDATE (name, items for draft) ==========
    const updateData: Record<string, unknown> = {}
    if (name) updateData.name = name
    if (status) updateData.status = status
    if (priority !== undefined) updateData.priority = priority
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null

    // If items are provided, replace them (only for draft plans)
    if (items && Array.isArray(items) && existing.status === 'draft') {
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
        customer: { select: { id: true, name: true } },
        items: { include: { product: true } },
        cuttingPlans: { include: { items: { include: { product: true } } } },
      },
    })

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

    if (existing.status !== 'draft') {
      return NextResponse.json({ error: 'Можно удалить только черновик' }, { status: 400 })
    }

    await db.plan.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete plan error:', error)
    return NextResponse.json({ error: 'Ошибка удаления плана' }, { status: 500 })
  }
}
