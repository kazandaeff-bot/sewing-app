import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, validateBody, validateQuery } from '@/lib/api-auth'
import { CreatePlanSchema, PlansQuerySchema } from '@/lib/schemas'

export const GET = withAuth(async (req, ctx, user) => {
  try {
    const q = validateQuery(req, PlansQuerySchema)
    if ('error' in q) return q.error
    const { customerId } = q.data

    // If user is a "customer" role, force filter by their customerId
    let filterCustomerId = customerId
    if (user.role === 'customer' && user.customerId) {
      filterCustomerId = user.customerId
    }

    const where = filterCustomerId ? { customerId: filterCustomerId } : {}

    const plans = await db.plan.findMany({
      where,
      orderBy: [
        { priority: 'desc' }, // urgent first
        { deadline: 'asc' },  // then by deadline
        { createdAt: 'desc' },
      ],
      include: {
        customer: { select: { id: true, name: true } },
        items: {
          include: { product: true },
          orderBy: { id: 'asc' },
        },
        cuttingPlans: true,
      },
    })
    return NextResponse.json(plans)
  } catch (error) {
    console.error('Get plans error:', error)
    return NextResponse.json({ error: 'Ошибка получения списка планов' }, { status: 500 })
  }
}, ['supervisor', 'customer'])

export const POST = withAuth(async (req, ctx, user) => {
  try {
    const result = await validateBody(req, CreatePlanSchema)
    if ('error' in result) return result.error
    const { customerId, items, priority, deadline } = result.data

    // Verify customer exists
    const customer = await db.customer.findUnique({ where: { id: customerId } })
    if (!customer) {
      return NextResponse.json({ error: 'Заказчик не найден' }, { status: 400 })
    }

    // Auto-generate plan name: "Заказчик #N от DD.MM.YYYY"
    const existingPlanCount = await db.plan.count({
      where: { customerId },
    })
    const planNumber = existingPlanCount + 1
    const now = new Date()
    const dateStr = now.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    const autoName = `${customer.name} #${planNumber} от ${dateStr}`

    const plan = await db.plan.create({
      data: {
        name: autoName,
        customerId,
        priority,
        deadline: deadline ? new Date(deadline) : null,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            size: item.size,
            color: item.color,
            colorHex: item.colorHex || '#9ca3af',
            quantity: item.quantity,
          })),
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
        items: { include: { product: true } },
        cuttingPlans: true,
      },
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    console.error('Create plan error:', error)
    return NextResponse.json({ error: 'Ошибка создания плана' }, { status: 500 })
  }
}, ['supervisor'])
