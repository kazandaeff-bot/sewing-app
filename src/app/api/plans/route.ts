import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const plans = await db.plan.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { product: true },
          orderBy: { id: 'asc' },
        },
        cuttingPlan: true,
      },
    })
    return NextResponse.json(plans)
  } catch (error) {
    console.error('Get plans error:', error)
    return NextResponse.json({ error: 'Ошибка получения списка планов' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, items } = body

    if (!name) {
      return NextResponse.json({ error: 'Укажите название плана' }, { status: 400 })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Добавьте хотя бы одну позицию' }, { status: 400 })
    }

    const plan = await db.plan.create({
      data: {
        name,
        items: {
          create: items.map((item: { productId: string; size: string; color: string; colorHex?: string; quantity: number }) => ({
            productId: item.productId,
            size: item.size,
            color: item.color,
            colorHex: item.colorHex || '#9ca3af',
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: { include: { product: true } },
        cuttingPlan: true,
      },
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    console.error('Create plan error:', error)
    return NextResponse.json({ error: 'Ошибка создания плана' }, { status: 500 })
  }
}