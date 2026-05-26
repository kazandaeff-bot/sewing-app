import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const materialId = searchParams.get('materialId')
    const productId = searchParams.get('productId')

    const where: Record<string, unknown> = {}
    if (materialId) where.materialId = materialId
    if (productId) where.productId = productId

    const norms = await db.materialNorm.findMany({
      where,
      include: {
        material: { include: { materialType: true } },
        product: true,
      },
      orderBy: { id: 'asc' },
    })
    return NextResponse.json(norms)
  } catch (error) {
    console.error('Get material norms error:', error)
    return NextResponse.json({ error: 'Ошибка получения норм расхода' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { materialId, productId, consumptionPerUnit, unit, autoCalculated } = body

    if (!materialId || !productId) {
      return NextResponse.json({ error: 'Укажите материал и изделие' }, { status: 400 })
    }
    if (consumptionPerUnit === undefined || consumptionPerUnit < 0) {
      return NextResponse.json({ error: 'Укажите корректную норму расхода' }, { status: 400 })
    }

    // Verify material and product exist
    const [material, product] = await Promise.all([
      db.material.findUnique({ where: { id: materialId } }),
      db.product.findUnique({ where: { id: productId } }),
    ])
    if (!material) {
      return NextResponse.json({ error: 'Материал не найден' }, { status: 404 })
    }
    if (!product) {
      return NextResponse.json({ error: 'Изделие не найдено' }, { status: 404 })
    }

    // Upsert: create or update
    const norm = await db.materialNorm.upsert({
      where: {
        materialId_productId: { materialId, productId },
      },
      update: {
        consumptionPerUnit,
        unit: unit || material.unit,
        autoCalculated: autoCalculated ?? false,
      },
      create: {
        materialId,
        productId,
        consumptionPerUnit,
        unit: unit || material.unit,
        autoCalculated: autoCalculated ?? false,
      },
      include: {
        material: { include: { materialType: true } },
        product: true,
      },
    })

    return NextResponse.json(norm, { status: 201 })
  } catch (error: unknown) {
    console.error('Create/update material norm error:', error)
    const prismaError = error as { code?: string }
    if (prismaError.code === 'P2002') {
      return NextResponse.json({ error: 'Норма расхода для этого материала и изделия уже существует' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Ошибка создания нормы расхода' }, { status: 500 })
  }
}
