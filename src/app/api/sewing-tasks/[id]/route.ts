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
        items: { include: { product: true, reworks: true } },
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
    const { status, items } = body

    const existing = await db.sewingTask.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 })
    }

    // ========== ITEM-LEVEL STATUS UPDATES ==========
    // Each SewingTaskItem can have its own status: issued → in_work → pending_ironing → pending_qc → completed
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (!item.id) continue
        const updateData: Record<string, unknown> = {}
        if (item.status !== undefined) {
          updateData.status = item.status
          // Set timing timestamps on status transitions
          if (item.status === 'in_work') updateData.startedAt = new Date()
          if (item.status === 'pending_qc') updateData.ironedAt = new Date()
          if (item.status === 'completed') updateData.completedAt = new Date()
        }
        if (item.actualQuantity !== undefined) updateData.actualQuantity = item.actualQuantity
        if (item.fabricDefect !== undefined) updateData.fabricDefect = item.fabricDefect
        if (item.defectNote !== undefined) updateData.defectNote = item.defectNote
        if (Object.keys(updateData).length > 0) {
          await db.sewingTaskItem.update({ where: { id: item.id }, data: updateData })
        }
      }
    }

    // ========== TASK-LEVEL STATUS UPDATE ==========
    // The task status auto-derives from item statuses:
    // - All items issued → task is "issued"
    // - Any item in_work → task is "in_work"
    // - All items pending_ironing → task is "pending_ironing"
    // - Some items ironed/pending_qc/completed → task could be "in_work"
    // - All items pending_qc or completed → task is "pending_qc"
    // - All items completed → task is "completed"
    if (status !== undefined) {
      // If explicitly setting task status, also update all items
      if (status === 'in_work') {
        // Mark all "issued" items as "in_work"
        await db.sewingTaskItem.updateMany({
          where: { sewingTaskId: id, status: 'issued' },
          data: { status: 'in_work', startedAt: new Date() },
        })
      } else if (status === 'pending_ironing') {
        // Mark all "in_work" items as "pending_ironing" (ВТО stage before QC)
        await db.sewingTaskItem.updateMany({
          where: { sewingTaskId: id, status: 'in_work' },
          data: { status: 'pending_ironing' },
        })
      } else if (status === 'pending_qc') {
        // Mark all "in_work" items as "pending_ironing" (they go through ВТО first)
        await db.sewingTaskItem.updateMany({
          where: { sewingTaskId: id, status: 'in_work' },
          data: { status: 'pending_ironing' },
        })
      } else if (status === 'completed') {
        // Mark all items as "completed"
        await db.sewingTaskItem.updateMany({
          where: { sewingTaskId: id },
          data: { status: 'completed', completedAt: new Date() },
        })
      }

      await db.sewingTask.update({ where: { id }, data: { status } })
    } else {
      // Auto-derive task status from item statuses
      const currentItems = await db.sewingTaskItem.findMany({ where: { sewingTaskId: id } })
      const allStatuses = currentItems.map(i => i.status)
      
      let newTaskStatus = existing.status
      if (allStatuses.length === 0) {
        newTaskStatus = 'completed'
      } else if (allStatuses.every(s => s === 'completed')) {
        newTaskStatus = 'completed'
      } else if (allStatuses.every(s => s === 'pending_qc' || s === 'completed')) {
        newTaskStatus = 'pending_qc'
      } else if (allStatuses.every(s => s === 'pending_ironing' || s === 'ironed' || s === 'pending_qc' || s === 'completed')) {
        // All items are past sewing stage (in ВТО or beyond)
        newTaskStatus = 'pending_ironing'
      } else if (allStatuses.some(s => ['in_work', 'pending_ironing', 'ironed', 'pending_qc', 'completed'].includes(s))) {
        newTaskStatus = 'in_work'
      }

      if (newTaskStatus !== existing.status) {
        await db.sewingTask.update({ where: { id }, data: { status: newTaskStatus } })
      }
    }

    // Return updated task with items
    const updated = await db.sewingTask.findUnique({
      where: { id },
      include: {
        cuttingPlan: { include: { plan: true } },
        employee: true,
        items: { include: { product: true, reworks: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update sewing task error:', error)
    return NextResponse.json({ error: 'Ошибка обновления задания' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.sewingRework.deleteMany({
      where: { sewingTaskId: id },
    })
    await db.sewingTaskItem.deleteMany({ where: { sewingTaskId: id } })
    await db.sewingTask.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete sewing task error:', error)
    return NextResponse.json({ error: 'Ошибка удаления задания' }, { status: 500 })
  }
}
