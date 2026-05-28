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
    // If user is a "customer" role, filter by their customerId
    const user = getSessionUser(request)
    const where = (user?.role === 'customer' && user?.customerId)
      ? { customerId: user.customerId }
      : {}

    const sellerPlans = await db.sellerPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true } },
        items: {
          include: {
            product: true,
            cities: true,
          },
          orderBy: { id: 'asc' },
        },
        boxes: {
          include: {
            items: { include: { product: true } },
          },
        },
      },
    })
    return NextResponse.json(sellerPlans)
  } catch (error) {
    console.error('Get seller plans error:', error)
    return NextResponse.json({ error: 'Ошибка получения планов от селлеров' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sellerName, customerId, planId, items } = body

    if (!sellerName) {
      return NextResponse.json({ error: 'Укажите название плана' }, { status: 400 })
    }

    // If planId provided, auto-fill items from the sewing plan
    let finalItems = items
    if (planId) {
      const plan = await db.plan.findUnique({
        where: { id: planId },
        include: {
          items: {
            include: { product: true },
            orderBy: { id: 'asc' },
          },
        },
      })

      if (!plan) {
        return NextResponse.json({ error: 'План пошива не найден' }, { status: 400 })
      }

      // Use plan's customerId if not explicitly provided
      if (!customerId && plan.customerId) {
        body.customerId = plan.customerId
      }

      // Build a map of cities from the passed items, keyed by "productId-size-color"
      const citiesMap = new Map<string, { city: string; quantity: number }[]>()
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const key = `${item.productId}-${item.size}-${item.color}`
          if (item.cities && item.cities.length > 0) {
            citiesMap.set(key, item.cities)
          }
        }
      }

      // Auto-fill items from plan, merging cities from the request
      finalItems = plan.items.map(item => {
        const key = `${item.productId}-${item.size}-${item.color}`
        return {
          productId: item.productId,
          size: item.size,
          color: item.color,
          colorHex: item.colorHex,
          quantity: item.quantity,
          cities: citiesMap.get(key) || [] as { city: string; quantity: number }[],
        }
      })
    }

    if (!finalItems || !Array.isArray(finalItems) || finalItems.length === 0) {
      return NextResponse.json({ error: 'Добавьте хотя бы одну позицию' }, { status: 400 })
    }

    const effectiveCustomerId = customerId || body.customerId || null

    const sellerPlan = await db.sellerPlan.create({
      data: {
        sellerName,
        customerId: effectiveCustomerId || null,
        items: {
          create: finalItems.map((item: { productId: string; size: string; color: string; colorHex?: string; quantity: number; cities?: { city: string; quantity: number }[] }) => ({
            productId: item.productId,
            size: item.size,
            color: item.color,
            colorHex: item.colorHex || '#9ca3af',
            quantity: item.quantity,
            cities: {
              create: (item.cities || []).map((city: { city: string; quantity: number }) => ({
                city: city.city,
                quantity: city.quantity,
              })),
            },
          })),
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
        items: {
          include: {
            product: true,
            cities: true,
          },
        },
        boxes: true,
      },
    })

    return NextResponse.json(sellerPlan, { status: 201 })
  } catch (error) {
    console.error('Create seller plan error:', error)
    return NextResponse.json({ error: 'Ошибка создания плана селлера' }, { status: 500 })
  }
}
