import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const box = await db.box.findUnique({
      where: { id },
      include: {
        sellerPlan: { select: { id: true, sellerName: true } },
        items: { include: { product: true } },
      },
    })
    if (!box) {
      return NextResponse.json({ error: 'Короб не найден' }, { status: 404 })
    }
    return NextResponse.json(box)
  } catch (error) {
    console.error('Get box error:', error)
    return NextResponse.json({ error: 'Ошибка получения короба' }, { status: 500 })
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

    const existing = await db.box.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Короб не найден' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status

    // Update actualQty on items
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.id && item.actualQty !== undefined) {
          await db.boxItem.update({
            where: { id: item.id },
            data: { actualQty: item.actualQty },
          })
        }
      }
    }

    const updated = await db.box.update({
      where: { id },
      data: updateData,
      include: {
        sellerPlan: { select: { id: true, sellerName: true } },
        items: { include: { product: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update box error:', error)
    return NextResponse.json({ error: 'Ошибка обновления короба' }, { status: 500 })
  }
}