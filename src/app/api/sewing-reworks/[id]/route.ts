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

    // When seamstress marks rework as done → goes back to QC for re-check
    if (status === 'pending_qc') {
      // Just update the rework status — QC will see it in the reworks list
      // The parent task status is not changed; reworks are tracked independently
    }

    // When QC approves the rework → mark completed
    // NOTE: We do NOT add rework quantity to actualQuantity.
    // Rework verification is part of normal QC duties (paid by plan quantity).
    // actualQuantity stays as the first-pass accepted count.
    if (status === 'completed') {
      // No actualQuantity update — rework check is included in base pay
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
