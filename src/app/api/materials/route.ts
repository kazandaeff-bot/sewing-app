import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const materialTypeId = searchParams.get('materialTypeId')

    const where: Record<string, unknown> = {}
    if (materialTypeId) where.materialTypeId = materialTypeId

    const materials = await db.material.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        materialType: true,
        entries: {
          orderBy: { date: 'desc' },
        },
        norms: {
          include: { product: true },
        },
      },
    })
    return NextResponse.json(materials)
  } catch (error) {
    console.error('Get materials error:', error)
    return NextResponse.json({ error: 'Ошибка получения списка материалов' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { materialTypeId, name, totalQty, unit } = body

    if (!materialTypeId) {
      return NextResponse.json({ error: 'Укажите тип материала' }, { status: 400 })
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Укажите название материала' }, { status: 400 })
    }

    // Verify material type exists
    const materialType = await db.materialType.findUnique({ where: { id: materialTypeId } })
    if (!materialType) {
      return NextResponse.json({ error: 'Тип материала не найден' }, { status: 404 })
    }

    const material = await db.material.create({
      data: {
        materialTypeId,
        name: name.trim(),
        totalQty: totalQty || 0,
        unit: unit || materialType.unit,
      },
      include: {
        materialType: true,
      },
    })

    // If initial stock > 0, create an incoming entry
    if (totalQty && totalQty > 0) {
      await db.materialEntry.create({
        data: {
          materialId: material.id,
          type: 'incoming',
          qty: totalQty,
          note: 'Начальный остаток',
        },
      })
    }

    return NextResponse.json(material, { status: 201 })
  } catch (error) {
    console.error('Create material error:', error)
    return NextResponse.json({ error: 'Ошибка создания материала' }, { status: 500 })
  }
}
