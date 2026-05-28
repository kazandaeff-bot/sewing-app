import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const customerId = searchParams.get('customerId')

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    // Filter by customer via cutting plan → plan → customerId
    const leftovers = await db.cuttingLeftover.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        cuttingPlan: {
          include: {
            plan: {
              select: { id: true, name: true, customerId: true, customer: { select: { id: true, name: true } } },
            },
          },
        },
      },
    })

    // If filtering by customer, do it in-memory (SQLite, small dataset)
    const filtered = customerId
      ? leftovers.filter((l: { cuttingPlan: { plan: { customerId: string | null } } }) => l.cuttingPlan.plan.customerId === customerId)
      : leftovers

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('Get cutting leftovers error:', error)
    return NextResponse.json({ error: 'Ошибка получения остатков кроя' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cuttingPlanId, cuttingPlanItemId, productId, size, color, colorHex, quantity, source, note } = body

    if (!cuttingPlanId || !productId || !size || !color || !quantity) {
      return NextResponse.json({ error: 'Заполните все обязательные поля' }, { status: 400 })
    }

    if (quantity <= 0) {
      return NextResponse.json({ error: 'Количество должно быть больше 0' }, { status: 400 })
    }

    const leftover = await db.cuttingLeftover.create({
      data: {
        cuttingPlanId,
        cuttingPlanItemId: cuttingPlanItemId || null,
        productId,
        size,
        color,
        colorHex: colorHex || '#9ca3af',
        quantity,
        source: source || 'cutting',
        note: note || null,
      },
      include: {
        product: true,
        cuttingPlan: {
          include: {
            plan: {
              select: { id: true, name: true, customer: { select: { id: true, name: true } } },
            },
          },
        },
      },
    })

    return NextResponse.json(leftover, { status: 201 })
  } catch (error) {
    console.error('Create cutting leftover error:', error)
    return NextResponse.json({ error: 'Ошибка создания остатка кроя' }, { status: 500 })
  }
}
