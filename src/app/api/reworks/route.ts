import { db } from '@/lib/db'
import { validateBody } from '@/lib/api-auth'
import { CreateReworkSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const reworks = await db.rework.findMany({
      where,
      include: {
        task: {
          include: {
            employee: true,
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(reworks)
  } catch (error) {
    console.error('Get reworks error:', error)
    return NextResponse.json({ error: 'Ошибка получения переделок' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await validateBody(request, CreateReworkSchema)
    if ('error' in result) return result.error
    const { taskId, quantity, reason } = result.data

    const rework = await db.rework.create({
      data: {
        taskId,
        quantity,
        reason,
      },
      include: {
        task: {
          include: {
            employee: true,
            product: true,
          },
        },
      },
    })

    return NextResponse.json(rework, { status: 201 })
  } catch (error) {
    console.error('Create rework error:', error)
    return NextResponse.json({ error: 'Ошибка создания переделки' }, { status: 500 })
  }
}