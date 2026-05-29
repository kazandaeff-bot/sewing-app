import { db } from '@/lib/db'
import { validateBody } from '@/lib/api-auth'
import { CreateBoxTypeSchema } from '@/lib/schemas'
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
    const result = await validateBody(request, CreateBoxTypeSchema)
    if ('error' in result) return result.error
    const { name, dimensions, capacities } = result.data

    const boxType = await db.boxType.create({
      data: {
        name,
        dimensions: dimensions || null,
        capacities: capacities && capacities.length > 0 ? {
          create: capacities.map((c) => ({
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