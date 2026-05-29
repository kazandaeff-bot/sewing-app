import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { validateBody } from '@/lib/api-auth'
import { IroningUpdateSchema } from '@/lib/schemas'

export async function GET() {
  try {
    // Get all SewingTaskItems with status pending_ironing, grouped by SewingTask
    const items = await db.sewingTaskItem.findMany({
      where: { status: 'pending_ironing' },
      include: {
        product: true,
        sewingTask: {
          include: {
            employee: true,
            cuttingPlan: { include: { plan: true } },
          },
        },
      },
      orderBy: { id: 'asc' },
    })

    // Group by sewingTaskId
    const grouped: Record<string, {
      task: typeof items[0]['sewingTask']
      items: typeof items
    }> = {}

    for (const item of items) {
      const taskId = item.sewingTaskId
      if (!grouped[taskId]) {
        grouped[taskId] = { task: item.sewingTask, items: [] }
      }
      grouped[taskId].items.push(item)
    }

    return NextResponse.json(Object.values(grouped), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Get ironing items error:', error)
    return NextResponse.json({ error: 'Ошибка получения списка на утюжку' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const result = await validateBody(request, IroningUpdateSchema)
    if ('error' in result) return result.error
    const { itemIds } = result.data

    // Verify items exist and are in pending_ironing status
    const pendingItems = await db.sewingTaskItem.findMany({
      where: {
        id: { in: itemIds },
        status: 'pending_ironing',
      },
      select: { id: true, sewingTaskId: true },
    })

    if (pendingItems.length === 0) {
      return NextResponse.json(
        { error: 'Нет изделий в статусе "Ожидают утюжки". Возможно, они уже обработаны.' },
        { status: 404 }
      )
    }

    const validItemIds = pendingItems.map(i => i.id)

    // Mark items: pending_ironing → pending_qc (direct transition)
    await db.sewingTaskItem.updateMany({
      where: { id: { in: validItemIds }, status: 'pending_ironing' },
      data: { status: 'pending_qc', ironedAt: new Date() },
    })

    // Auto-derive task statuses for affected tasks
    const affectedTaskIds = [...new Set(pendingItems.map(i => i.sewingTaskId))]

    for (const taskId of affectedTaskIds) {
      const currentItems = await db.sewingTaskItem.findMany({ where: { sewingTaskId: taskId } })
      const allStatuses = currentItems.map(i => i.status)

      let newTaskStatus = 'issued'
      if (allStatuses.length === 0) {
        newTaskStatus = 'completed'
      } else if (allStatuses.every(s => s === 'completed')) {
        newTaskStatus = 'completed'
      } else if (allStatuses.every(s => s === 'pending_qc' || s === 'completed')) {
        newTaskStatus = 'pending_qc'
      } else if (allStatuses.every(s => s === 'pending_ironing' || s === 'pending_qc' || s === 'completed')) {
        newTaskStatus = 'pending_ironing'
      } else if (allStatuses.some(s => ['in_work', 'pending_ironing', 'pending_qc', 'completed'].includes(s))) {
        newTaskStatus = 'in_work'
      }

      await db.sewingTask.update({ where: { id: taskId }, data: { status: newTaskStatus } })
    }

    return NextResponse.json(
      { success: true, updated: validItemIds.length, skipped: itemIds.length - validItemIds.length },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Ironing update error:', error)
    return NextResponse.json({ error: 'Ошибка обновления статуса утюжки' }, { status: 500 })
  }
}
