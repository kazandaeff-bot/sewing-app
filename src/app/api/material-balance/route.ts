import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json({ error: 'Укажите customerId' }, { status: 400 })
    }

    // Check if the customer has showMaterialBalance enabled
    const customer = await db.customer.findUnique({ where: { id: customerId } })
    if (!customer) {
      return NextResponse.json({ error: 'Заказчик не найден' }, { status: 404 })
    }
    if (!customer.showMaterialBalance) {
      return NextResponse.json({ error: 'Доступ к остаткам материалов не открыт' }, { status: 403 })
    }

    // Get customer's products
    const customerProducts = await db.customerProduct.findMany({
      where: { customerId },
      select: { productId: true },
    })
    const productIds = customerProducts.map(cp => cp.productId)

    if (productIds.length === 0) {
      return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } })
    }

    // Get material norms for these products
    const norms = await db.materialNorm.findMany({
      where: { productId: { in: productIds } },
      include: {
        material: {
          include: {
            entries: {
              where: { type: 'consumed' },
              select: { qty: true, cuttingPlanId: true },
            },
          },
        },
        product: { select: { name: true } },
      },
    })

    // Build material balance summary
    const materialMap = new Map<string, {
      id: string
      name: string
      unit: string
      totalQty: number
      consumed: number
      norms: Array<{ productName: string; consumptionPerUnit: number; unit: string }>
    }>()

    for (const norm of norms) {
      const matId = norm.materialId
      if (!materialMap.has(matId)) {
        const totalConsumed = norm.material.entries.reduce((sum, e) => sum + e.qty, 0)
        materialMap.set(matId, {
          id: norm.materialId,
          name: norm.material.name,
          unit: norm.material.unit,
          totalQty: norm.material.totalQty,
          consumed: totalConsumed,
          norms: [],
        })
      }
      materialMap.get(matId)!.norms.push({
        productName: norm.product.name,
        consumptionPerUnit: norm.consumptionPerUnit,
        unit: norm.unit,
      })
    }

    return NextResponse.json(Array.from(materialMap.values()), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Get material balance error:', error)
    return NextResponse.json({ error: 'Ошибка получения остатков материалов' }, { status: 500 })
  }
}
