import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sellerPlan = await db.sellerPlan.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            cities: true,
          },
        },
        boxes: {
          include: {
            items: { include: { product: true } },
          },
        },
      },
    })
    if (!sellerPlan) {
      return NextResponse.json({ error: 'План селлера не найден' }, { status: 404 })
    }
    return NextResponse.json(sellerPlan)
  } catch (error) {
    console.error('Get seller plan error:', error)
    return NextResponse.json({ error: 'Ошибка получения плана селлера' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body

    const existing = await db.sellerPlan.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'План селлера не найден' }, { status: 404 })
    }

    const updated = await db.sellerPlan.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: {
            product: true,
            cities: true,
          },
        },
        boxes: {
          include: {
            items: { include: { product: true } },
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update seller plan error:', error)
    return NextResponse.json({ error: 'Ошибка обновления плана селлера' }, { status: 500 })
  }
}