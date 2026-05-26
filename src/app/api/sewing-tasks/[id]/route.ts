import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sewingTask = await db.sewingTask.findUnique({
      where: { id },
      include: {
        cuttingPlan: { include: { plan: true, items: { include: { product: true } } } },
        employee: true,
        items: { include: { product: true } },
      },
    })
    if (!sewingTask) {
      return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 })
    }
    return NextResponse.json(sewingTask)
  } catch (error) {
    console.error('Get sewing task error:', error)
    return NextResponse.json({ error: 'Ошибка получения задания' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, items, submitToQc } = body

    const existing = await db.sewingTask.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 })
    }

    // ========== PARTIAL SUBMISSION TO QC ==========
    // When submitToQc is provided, split the task: sent items go to a new pending_qc task,
    // remaining items stay in the original in_work task
    if (submitToQc && Array.isArray(submitToQc)) {
      // Validate: sum of submitted quantities must not exceed original item quantity
      for (const submitItem of submitToQc) {
        const originalItem = existing.items.find(i => i.id === submitItem.id)
        if (!originalItem) {
          return NextResponse.json({ error: `Позиция ${submitItem.id} не найдена в задании` }, { status: 400 })
        }
        if (submitItem.sendQty > originalItem.quantity) {
          return NextResponse.json({ error: `Количество отправляемого превышает план для позиции` }, { status: 400 })
        }
        if (submitItem.sendQty < 0) {
          return NextResponse.json({ error: `Количество не может быть отрицательным` }, { status: 400 })
        }
      }

      // Check if ALL items are fully submitted (= full submission, no split needed)
      const allFullySubmitted = existing.items.every(item => {
        const submitItem = submitToQc.find(s => s.id === item.id)
        return submitItem && submitItem.sendQty >= item.quantity
      })

      if (allFullySubmitted) {
        // Full submission — just update the task status and item details
        for (const submitItem of submitToQc) {
          const updateData: Record<string, unknown> = {}
          if (submitItem.actualQuantity !== undefined) updateData.actualQuantity = submitItem.actualQuantity
          if (submitItem.fabricDefect !== undefined) updateData.fabricDefect = submitItem.fabricDefect
          if (submitItem.defectNote !== undefined) updateData.defectNote = submitItem.defectNote
          if (Object.keys(updateData).length > 0) {
            await db.sewingTaskItem.update({ where: { id: submitItem.id }, data: updateData })
          }
        }
        const updated = await db.sewingTask.update({
          where: { id },
          data: { status: 'pending_qc' },
          include: {
            cuttingPlan: { include: { plan: true } },
            employee: true,
            items: { include: { product: true } },
          },
        })
        return NextResponse.json(updated)
      }

      // PARTIAL submission — split the task
      // 1. Create a new SewingTask with status pending_qc containing the sent items
      const sentItems = submitToQc
        .filter(s => s.sendQty > 0)
        .map(s => {
          const originalItem = existing.items.find(i => i.id === s.id)!
          return {
            productId: originalItem.productId,
            size: originalItem.size,
            color: originalItem.color,
            colorHex: originalItem.colorHex,
            quantity: s.sendQty,
            actualQuantity: s.actualQuantity ?? s.sendQty,
            fabricDefect: s.fabricDefect ?? 0,
            defectNote: s.defectNote ?? null,
          }
        })

      if (sentItems.length === 0) {
        return NextResponse.json({ error: 'Укажите хотя бы одну позицию для отправки' }, { status: 400 })
      }

      const newTask = await db.sewingTask.create({
        data: {
          cuttingPlanId: existing.cuttingPlanId,
          employeeId: existing.employeeId,
          status: 'pending_qc',
          items: { create: sentItems },
        },
        include: {
          cuttingPlan: { include: { plan: true } },
          employee: true,
          items: { include: { product: true } },
        },
      })

      // 2. Reduce quantities on original items (or delete if fully sent)
      for (const submitItem of submitToQc) {
        const originalItem = existing.items.find(i => i.id === submitItem.id)
        if (!originalItem) continue

        const remaining = originalItem.quantity - submitItem.sendQty
        if (remaining <= 0) {
          // Delete the item from original task
          await db.sewingTaskItem.delete({ where: { id: originalItem.id } })
        } else {
          // Reduce quantity on original item
          await db.sewingTaskItem.update({
            where: { id: originalItem.id },
            data: { quantity: remaining },
          })
        }
      }

      // 3. Check if original task still has items; if not, mark it completed
      const remainingItems = await db.sewingTaskItem.findMany({ where: { sewingTaskId: id } })
      if (remainingItems.length === 0) {
        await db.sewingTask.update({ where: { id }, data: { status: 'completed' } })
      }

      return NextResponse.json({ newTask, remainingItemsCount: remainingItems.length })
    }

    // ========== NORMAL UPDATE (status change, item details) ==========
    // If items with actualQuantity/fabricDefect are provided, update them
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.id) {
          const updateData: Record<string, unknown> = {}
          if (item.actualQuantity !== undefined) updateData.actualQuantity = item.actualQuantity
          if (item.fabricDefect !== undefined) updateData.fabricDefect = item.fabricDefect
          if (item.defectNote !== undefined) updateData.defectNote = item.defectNote
          if (Object.keys(updateData).length > 0) {
            await db.sewingTaskItem.update({ where: { id: item.id }, data: updateData })
          }
        }
      }
    }

    const data: Record<string, unknown> = {}
    if (status !== undefined) data.status = status

    const updated = await db.sewingTask.update({
      where: { id },
      data,
      include: {
        cuttingPlan: { include: { plan: true } },
        employee: true,
        items: { include: { product: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update sewing task error:', error)
    return NextResponse.json({ error: 'Ошибка обновления задания' }, { status: 500 })
  }
}
