import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAuth, validateQuery, validateBody } from '@/lib/api-auth'
import { CreateCuttingLeftoverSchema, CuttingLeftoversQuerySchema } from '@/lib/schemas'

export const GET = withAuth(async (req, ctx, user) => {
  try {
    const q = validateQuery(req, CuttingLeftoversQuerySchema)
    if ('error' in q) return q.error
    const { status, customerId } = q.data

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const leftovers = await db.cuttingLeftover.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        cuttingPlan: {
          include: {
            plan: {
              select: { id: true, name: true, customerId: true, customer: { select: { id: true, name: true } } },
            },
          },
        },
      },
    })

    const filtered = customerId
      ? leftovers.filter((l: { cuttingPlan: { plan: { customerId: string | null } } }) => l.cuttingPlan.plan.customerId === customerId)
      : leftovers

    return NextResponse.json(filtered)
  } catch (error) {
    console.error('Get cutting leftovers error:', error)
    return NextResponse.json({ error: 'Ошибка получения остатков кроя' }, { status: 500 })
  }
}, ['supervisor', 'cutter'])

export const POST = withAuth(async (req, ctx, user) => {
  try {
    const result = await validateBody(req, CreateCuttingLeftoverSchema)
    if ('error' in result) return result.error
    const { cuttingPlanId, cuttingPlanItemId, productId, size, color, colorHex, quantity, source, note } = result.data

    const leftover = await db.cuttingLeftover.create({
      data: {
        cuttingPlanId,
        cuttingPlanItemId: cuttingPlanItemId || null,
        productId,
        size,
        color,
        colorHex: colorHex || '#9ca3af',
        quantity,
        source: source || 'cutting',
        note: note || null,
      },
      include: {
        product: true,
        cuttingPlan: {
          include: {
            plan: {
              select: { id: true, name: true, customer: { select: { id: true, name: true } } },
            },
          },
        },
      },
    })

    return NextResponse.json(leftover, { status: 201 })
  } catch (error) {
    console.error('Create cutting leftover error:', error)
    return NextResponse.json({ error: 'Ошибка создания остатка кроя' }, { status: 500 })
  }
}, ['supervisor', 'cutter'])
