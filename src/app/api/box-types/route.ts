import { db } from '@/lib/db'
import { withAuth, validateBody } from '@/lib/api-auth'
import { CreateBoxTypeSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withAuth(async (req, ctx, user) => {
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
}, ['supervisor'])

export const POST = withAuth(async (req, ctx, user) => {
  try {
    const result = await validateBody(req, CreateBoxTypeSchema)
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
}, ['supervisor'])
