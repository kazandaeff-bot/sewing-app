import { db } from '@/lib/db'
import { validateBody } from '@/lib/api-auth'
import { CreateMaterialSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    // If customerId is provided, filter materials by customer's products
    if (customerId) {
      const customer = await db.customer.findUnique({ where: { id: customerId } })
      if (!customer || !customer.showMaterialBalance) {
        return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } })
      }

      const customerProducts = await db.customerProduct.findMany({
        where: { customerId },
        select: { productId: true },
      })
      const productIds = customerProducts.map(cp => cp.productId)

      if (productIds.length === 0) {
        return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } })
      }

      // Find materials that have norms linked to these products
      const materialIds = await db.materialNorm.findMany({
        where: { productId: { in: productIds } },
        select: { materialId: true },
      })
      const uniqueMaterialIds = [...new Set(materialIds.map(m => m.materialId))]

      const materials = await db.material.findMany({
        where: { id: { in: uniqueMaterialIds } },
        orderBy: { name: 'asc' },
        include: { materialType: true, norms: { include: { product: true } } },
      })
      return NextResponse.json(materials, { headers: { 'Cache-Control': 'no-store' } })
    }

    // Default: return all materials
    const materials = await db.material.findMany({
      orderBy: { name: 'asc' },
      include: { materialType: true, norms: { include: { product: true } } },
    })
    return NextResponse.json(materials, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Get materials error:', error)
    return NextResponse.json({ error: 'Ошибка получения списка материалов' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await validateBody(request, CreateMaterialSchema)
    if ('error' in result) return result.error
    const { materialTypeId, name, unit, totalQty } = result.data
    const material = await db.material.create({
      data: {
        materialTypeId,
        name,
        unit,
        totalQty,
      },
      include: { materialType: true, norms: true },
    })
    return NextResponse.json(material, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Create material error:', error)
    return NextResponse.json({ error: 'Ошибка создания материала' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
