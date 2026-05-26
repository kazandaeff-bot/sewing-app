import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const boxTypes = await db.boxType.findMany({
      orderBy: { name: 'asc' },
      include: {
        capacities: { include: { product: true } },
      },
    })
    return NextResponse.json(boxTypes)
  } catch (error) {
    console.error('Get box types error:', error)
    return NextResponse.json({ error: 'Ошибка получения типов коробов' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, dimensions, capacities } = body
    if (!name) {
      return NextResponse.json({ error: 'Укажите название типа короба' }, { status: 400 })
    }

    const boxType = await db.boxType.create({
      data: {
        name,
        dimensions: dimensions || null,
        capacities: capacities && capacities.length > 0 ? {
          create: capacities.map((c: { productId: string; size: string; maxQty: number }) => ({
            productId: c.productId,
            size: c.size,
            maxQty: c.maxQty,
          }))
        } : undefined,
      },
      include: {
        capacities: { include: { product: true } },
      },
    })
    return NextResponse.json(boxType, { status: 201 })
  } catch (error) {
    console.error('Create box type error:', error)
    return NextResponse.json({ error: 'Ошибка создания типа короба' }, { status: 500 })
  }
}