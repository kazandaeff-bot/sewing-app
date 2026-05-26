import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const sewingTaskId = searchParams.get('sewingTaskId')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (sewingTaskId) where.sewingTaskId = sewingTaskId

    const reworks = await db.sewingRework.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(reworks)
  } catch (error) {
    console.error('Get sewing reworks error:', error)
    return NextResponse.json({ error: 'Ошибка получения переделок' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sewingTaskItemId, sewingTaskId, quantity, reason } = body

    if (!sewingTaskItemId || !sewingTaskId || !quantity || !reason) {
      return NextResponse.json({ error: 'Заполните все обязательные поля' }, { status: 400 })
    }

    // Validate item exists
    const item = await db.sewingTaskItem.findUnique({
      where: { id: sewingTaskItemId },
    })
    if (!item) {
      return NextResponse.json({ error: 'Позиция задания не найдена' }, { status: 404 })
    }

    const rework = await db.sewingRework.create({
      data: {
        sewingTaskItemId,
        sewingTaskId,
        quantity: parseInt(quantity),
        reason,
      },
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

    return NextResponse.json(rework, { status: 201 })
  } catch (error) {
    console.error('Create sewing rework error:', error)
    return NextResponse.json({ error: 'Ошибка создания переделки' }, { status: 500 })
  }
}
