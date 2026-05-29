import { db } from '@/lib/db'
import { validateBody } from '@/lib/api-auth'
import { CreateReworkReasonSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const where: Record<string, unknown> = {}
    if (productId) where.productId = productId
    const reasons = await db.reworkReason.findMany({ where, orderBy: { createdAt: 'desc' } })
    return NextResponse.json(reasons)
  } catch (error) {
    console.error('Get rework reasons error:', error)
    return NextResponse.json({ error: 'Ошибка получения причин переделок' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await validateBody(request, CreateReworkReasonSchema)
    if ('error' in result) return result.error
    const { productId, text } = result.data
    const reason = await db.reworkReason.create({ data: { productId, text } })
    return NextResponse.json(reason, { status: 201 })
  } catch (error) {
    console.error('Create rework reason error:', error)
    return NextResponse.json({ error: 'Ошибка создания причины переделки' }, { status: 500 })
  }
}