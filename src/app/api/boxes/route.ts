import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const customerId = url.searchParams.get('customerId')
    const where: Record<string, unknown> = {}
    if (customerId) {
      where.sellerPlan = { customerId }
    }
    const boxes = await db.box.findMany({
      where,
      orderBy: [{ city: 'asc' }, { boxNumber: 'asc' }],
      include: {
        sellerPlan: { select: { id: true, sellerName: true } },
        items: {
          include: { product: true },
          orderBy: { id: 'asc' },
        },
      },
    })
    return NextResponse.json(boxes)
  } catch (error) {
    console.error('Get boxes error:', error)
    return NextResponse.json({ error: 'Ошибка получения коробов' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sellerPlanId } = body

    if (!sellerPlanId) {
      return NextResponse.json({ error: 'Укажите план селлера' }, { status: 400 })
    }

    const sellerPlan = await db.sellerPlan.findUnique({
      where: { id: sellerPlanId },
      include: {
        items: {
          include: {
            product: true,
            cities: true,
          },
        },
      },
    })

    if (!sellerPlan) {
      return NextResponse.json({ error: 'План селлера не найден' }, { status: 404 })
    }

    if (sellerPlan.status !== 'approved') {
      return NextResponse.json({ error: 'План селлера должен быть утверждён' }, { status: 400 })
    }

    // Delete existing boxes for this plan
    await db.box.deleteMany({ where: { sellerPlanId } })

    // Group items by city
    const cityItemsMap: Record<string, Array<{ productId: string; size: string; color: string; colorHex: string; quantity: number; article: string }>> = {}

    for (const item of sellerPlan.items) {
      for (const city of item.cities) {
        if (!cityItemsMap[city.city]) {
          cityItemsMap[city.city] = []
        }
        cityItemsMap[city.city].push({
          productId: item.productId,
          size: item.size,
          color: item.color,
          colorHex: item.colorHex || '#9ca3af',
          quantity: city.quantity,
          article: item.product.article,
        })
      }
    }

    // For each city, sort and pack items into boxes
    const createdBoxes = []

    for (const [city, cityItems] of Object.entries(cityItemsMap)) {
      // Sort items by: article -> color -> size (grouping logic)
      const sortedItems = [...cityItems].sort((a, b) => {
        const articleComp = a.article.localeCompare(b.article)
        if (articleComp !== 0) return articleComp
        const colorComp = a.color.localeCompare(b.color)
        if (colorComp !== 0) return colorComp
        return a.size.localeCompare(b.size)
      })

      // Create one box per city with all items (simple packing)
      // Items with same article+size+color go together
      let boxNumber = 1

      const box = await db.box.create({
        data: {
          sellerPlanId,
          boxNumber,
          city,
          status: 'forming',
          items: {
            create: sortedItems.map((item) => ({
              productId: item.productId,
              size: item.size,
              color: item.color,
              colorHex: item.colorHex,
              plannedQty: item.quantity,
              actualQty: null,
            })),
          },
        },
        include: {
          items: { include: { product: true } },
        },
      })

      createdBoxes.push(box)
    }

    return NextResponse.json(createdBoxes, { status: 201 })
  } catch (error) {
    console.error('Create boxes error:', error)
    return NextResponse.json({ error: 'Ошибка генерации коробов' }, { status: 500 })
  }
}