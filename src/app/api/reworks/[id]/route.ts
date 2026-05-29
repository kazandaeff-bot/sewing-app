import { db } from '@/lib/db'
import { validateBody } from '@/lib/api-auth'
import { UpdateReworkSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await validateBody(request, UpdateReworkSchema)
    if ('error' in result) return result.error
    const { status } = result.data

    // When seamstress marks rework as done → goes back to QC
    if (status === 'pending_qc') {
      const existingRework = await db.rework.findUnique({ where: { id } })
      if (existingRework) {
        await db.task.update({
          where: { id: existingRework.taskId },
          data: { status: 'pending_qc' },
        })
      }
    }

    // When QC approves the rework → add quantity to actual and complete
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
}