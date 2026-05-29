import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAuth, validateQuery, validateBody } from '@/lib/api-auth'
import { CreateReworkReasonSchema, ReworkReasonsQuerySchema } from '@/lib/schemas'

export const GET = withAuth(async (req, ctx, user) => {
  try {
    const q = validateQuery(req, ReworkReasonsQuerySchema)
    if ('error' in q) return q.error
    const { productId } = q.data

    const where: Record<string, unknown> = {}
    if (productId) where.productId = productId
    const reasons = await db.reworkReason.findMany({ where, orderBy: { createdAt: 'desc' } })
    return NextResponse.json(reasons)
  } catch (error) {
    console.error('Get rework reasons error:', error)
    return NextResponse.json({ error: 'Ошибка получения причин переделок' }, { status: 500 })
  }
}, ['supervisor', 'qc'])

export const POST = withAuth(async (req, ctx, user) => {
  try {
    const result = await validateBody(req, CreateReworkReasonSchema)
    if ('error' in result) return result.error
    const { productId, text } = result.data
    const reason = await db.reworkReason.create({ data: { productId, text } })
    return NextResponse.json(reason, { status: 201 })
  } catch (error) {
    console.error('Create rework reason error:', error)
    return NextResponse.json({ error: 'Ошибка создания причины переделки' }, { status: 500 })
  }
}, ['supervisor', 'qc'])
