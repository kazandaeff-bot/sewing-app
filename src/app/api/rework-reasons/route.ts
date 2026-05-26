import { db } from '@/lib/db'
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
    const body = await request.json()
    const { productId, text } = body
    if (!productId || !text) {
      return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 })
    }
    const reason = await db.reworkReason.create({ data: { productId, text } })
    return NextResponse.json(reason, { status: 201 })
  } catch (error) {
    console.error('Create rework reason error:', error)
    return NextResponse.json({ error: 'Ошибка создания причины переделки' }, { status: 500 })
  }
}