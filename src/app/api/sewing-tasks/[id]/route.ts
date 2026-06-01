import { db, EMPLOYEE_PUBLIC_INCLUDE } from '@/lib/db'
import { withAuth, validateBody, validateParams } from '@/lib/api-auth'
import { UpdateSewingTaskSchema, IdParamSchema } from '@/lib/schemas'
import { NextResponse } from 'next/server'

export const GET = withAuth(async (_req, ctx) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const sewingTask = await db.sewingTask.findUnique({
      where: { id },
      include: {
        cuttingPlan: { include: { plan: true, items: { include: { product: true } } } },
        employee: EMPLOYEE_PUBLIC_INCLUDE,
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
}, ['supervisor', 'sewer'])

export const PATCH = withAuth(async (req, ctx) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, UpdateSewingTaskSchema)
    if ('error' in result) return result.error
    const { status, items } = result.data

    const existing = await db.sewingTask.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 })
    }

    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (!item.id) continue
        const updateData: Record<string, unknown> = {}
        if (item.status !== undefined) {
          updateData.status = item.status
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

    if (status !== undefined) {
      if (status === 'in_work') {
        await db.sewingTaskItem.updateMany({
          where: { sewingTaskId: id, status: 'issued' },
          data: { status: 'in_work', startedAt: new Date() },
        })
      } else if (status === 'pending_ironing') {
        await db.sewingTaskItem.updateMany({
          where: { sewingTaskId: id, status: 'in_work' },
          data: { status: 'pending_ironing' },
        })
      } else if (status === 'pending_qc') {
        await db.sewingTaskItem.updateMany({
          where: { sewingTaskId: id, status: 'in_work' },
          data: { status: 'pending_ironing' },
        })
      } else if (status === 'completed') {
        await db.sewingTaskItem.updateMany({
          where: { sewingTaskId: id },
          data: { status: 'completed', completedAt: new Date() },
        })
      }

      await db.sewingTask.update({ where: { id }, data: { status } })
    } else {
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
        newTaskStatus = 'pending_ironing'
      } else if (allStatuses.some(s => ['in_work', 'pending_ironing', 'ironed', 'pending_qc', 'completed'].includes(s))) {
        newTaskStatus = 'in_work'
      }

      if (newTaskStatus !== existing.status) {
        await db.sewingTask.update({ where: { id }, data: { status: newTaskStatus } })
      }
    }

    const updated = await db.sewingTask.findUnique({
      where: { id },
      include: {
        cuttingPlan: { include: { plan: true } },
        employee: EMPLOYEE_PUBLIC_INCLUDE,
        items: { include: { product: true, reworks: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update sewing task error:', error)
    return NextResponse.json({ error: 'Ошибка обновления задания' }, { status: 500 })
  }
}, ['supervisor', 'sewer'])

export const DELETE = withAuth(async (_req, ctx) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

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
}, ['supervisor'])
