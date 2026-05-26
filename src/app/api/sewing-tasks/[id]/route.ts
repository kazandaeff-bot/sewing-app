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
    const { status, items } = body

    const existing = await db.sewingTask.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 })
    }

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