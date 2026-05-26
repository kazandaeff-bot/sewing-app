import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: 'Укажите статус' }, { status: 400 })
    }

    const existingRework = await db.sewingRework.findUnique({
      where: { id },
      include: {
        sewingTaskItem: { include: { sewingTask: true } },
        sewingTask: true,
      },
    })
    if (!existingRework) {
      return NextResponse.json({ error: 'Переделка не найдена' }, { status: 404 })
    }

    // When seamstress marks rework as done → goes back to QC
    if (status === 'pending_qc') {
      // Create a new SewingTask in pending_qc for the rework items
      // or update the existing one
      // For simplicity, update the rework status and mark the parent task
      const parentTaskId = existingRework.sewingTaskId
      // Ensure the parent task is also visible to QC
      const parentTask = await db.sewingTask.findUnique({ where: { id: parentTaskId } })
      if (parentTask && parentTask.status !== 'pending_qc') {
        // Don't change the parent task status — just update the rework
      }
    }

    // When QC approves the rework → mark completed
    if (status === 'completed') {
      // Update the SewingTaskItem actualQuantity if needed
      if (existingRework.sewingTaskItem) {
        const newActual = (existingRework.sewingTaskItem.actualQuantity || 0) + existingRework.quantity
        await db.sewingTaskItem.update({
          where: { id: existingRework.sewingTaskItemId },
          data: { actualQuantity: newActual },
        })
      }
    }

    const rework = await db.sewingRework.update({
      where: { id },
      data: { status },
      include: {
        sewingTaskItem: {
          include: {
            product: true,
            sewingTask: {
              include: { employee: true },
            },
          },
        },
        sewingTask: {
          include: { employee: true },
        },
      },
    })

    return NextResponse.json(rework)
  } catch (error) {
    console.error('Update sewing rework error:', error)
    return NextResponse.json({ error: 'Ошибка обновления переделки' }, { status: 500 })
  }
}
