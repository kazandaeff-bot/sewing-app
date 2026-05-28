import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Helper: get current user from session cookie
 */
function getSessionUser(request: NextRequest) {
  try {
    const token = request.cookies.get('session')?.value
    if (!token) return null
    return JSON.parse(Buffer.from(token, 'base64').toString())
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryCustomerId = searchParams.get('customerId')

    // If user is a "customer" role, force filter by their customerId
    const user = getSessionUser(request)
    let filterCustomerId = queryCustomerId

    if (user?.role === 'customer' && user?.customerId) {
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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, items, priority, deadline } = body

    if (!customerId) {
      return NextResponse.json({ error: 'Выберите заказчика' }, { status: 400 })
    }

    // Verify customer exists
    const customer = await db.customer.findUnique({ where: { id: customerId } })
    if (!customer) {
      return NextResponse.json({ error: 'Заказчик не найден' }, { status: 400 })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Добавьте хотя бы одну позицию' }, { status: 400 })
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
        priority: priority || 'normal',
        deadline: deadline ? new Date(deadline) : null,
        items: {
          create: items.map((item: { productId: string; size: string; color: string; colorHex?: string; quantity: number }) => ({
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
}
