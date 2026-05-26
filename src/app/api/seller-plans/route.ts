import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const sellerPlans = await db.sellerPlan.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
            cities: true,
          },
          orderBy: { id: 'asc' },
        },
        boxes: {
          include: {
            items: { include: { product: true } },
          },
        },
      },
    })
    return NextResponse.json(sellerPlans)
  } catch (error) {
    console.error('Get seller plans error:', error)
    return NextResponse.json({ error: 'Ошибка получения планов от селлеров' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sellerName, items } = body

    if (!sellerName) {
      return NextResponse.json({ error: 'Укажите имя селлера' }, { status: 400 })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Добавьте хотя бы одну позицию' }, { status: 400 })
    }

    const sellerPlan = await db.sellerPlan.create({
      data: {
        sellerName,
        items: {
          create: items.map((item: { productId: string; size: string; color: string; colorHex?: string; quantity: number; cities?: { city: string; quantity: number }[] }) => ({
            productId: item.productId,
            size: item.size,
            color: item.color,
            colorHex: item.colorHex || '#9ca3af',
            quantity: item.quantity,
            cities: {
              create: (item.cities || []).map((city: { city: string; quantity: number }) => ({
                city: city.city,
                quantity: city.quantity,
              })),
            },
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
            cities: true,
          },
        },
        boxes: true,
      },
    })

    return NextResponse.json(sellerPlan, { status: 201 })
  } catch (error) {
    console.error('Create seller plan error:', error)
    return NextResponse.json({ error: 'Ошибка создания плана селлера' }, { status: 500 })
  }
}