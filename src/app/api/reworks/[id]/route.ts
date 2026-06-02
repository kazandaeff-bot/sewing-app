import { db } from '@/lib/db'
import { withAuth, validateBody, validateParams } from '@/lib/api-auth'
import { UpdateReworkSchema, IdParamSchema } from '@/lib/schemas'
import { NextResponse } from 'next/server'

export const PATCH = withAuth(async (req, ctx) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, UpdateReworkSchema)
    if ('error' in result) return result.error
    const { status } = result.data

    if (status === 'pending_qc') {
      const existingRework = await db.rework.findUnique({ where: { id } })
      if (existingRework) {
        await db.task.update({
          where: { id: existingRework.taskId },
          data: { status: 'pending_qc' },
        })
      }
    }

    if (status === 'completed') {
      const existingRework = await db.rework.findUnique({
        where: { id },
        include: { task: true },
      })
      if (existingRework?.task) {
        const newActual = (existingRework.task.actualQuantity || 0) + existingRework.quantity
        await db.task.update({
          where: { id: existingRework.taskId },
          data: { actualQuantity: newActual, status: 'completed', completedAt: new Date() },
        })
      }
    }

    const rework = await db.rework.update({
      where: { id },
      data: { status },
      include: {
        task: {
          include: { employee: true, product: true },
        },
      },
    })

    return NextResponse.json(rework)
  } catch (error) {
    console.error('Update rework error:', error)
    return NextResponse.json({ error: 'Ошибка обновления переделки' }, { status: 500 })
  }
}, ['supervisor', 'qc'])
