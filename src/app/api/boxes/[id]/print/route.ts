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
        sellerPlan: {
          select: {
            id: true,
            sellerName: true,
            status: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                article: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    })

    if (!box) {
      return NextResponse.json({ error: 'Короб не найден' }, { status: 404 })
    }

    // Format print-friendly data
    const printData = {
      boxId: box.id,
      boxNumber: box.boxNumber,
      city: box.city,
      status: box.status,
      sellerName: box.sellerPlan.sellerName,
      items: box.items.map((item) => ({
        id: item.id,
        productName: item.product.name,
        article: item.product.article,
        size: item.size,
        color: item.color,
        colorHex: item.colorHex,
        plannedQty: item.plannedQty,
        actualQty: item.actualQty,
        mismatch: item.actualQty !== null && item.actualQty !== item.plannedQty,
      })),
      totalPlanned: box.items.reduce((sum, item) => sum + item.plannedQty, 0),
      totalActual: box.items.reduce((sum, item) => sum + (item.actualQty || 0), 0),
      hasMismatches: box.items.some((item) => item.actualQty !== null && item.actualQty !== item.plannedQty),
      createdAt: box.createdAt,
    }

    return NextResponse.json(printData)
  } catch (error) {
    console.error('Get print data error:', error)
    return NextResponse.json({ error: 'Ошибка получения данных для печати' }, { status: 500 })
  }
}