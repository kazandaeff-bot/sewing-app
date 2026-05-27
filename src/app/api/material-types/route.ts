import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const materialTypes = await db.materialType.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { materials: true } },
      },
    })
    return NextResponse.json(materialTypes)
  } catch (error) {
    console.error('Get material types error:', error)
    return NextResponse.json({ error: 'Ошибка получения типов материалов' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, unit } = body
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Укажите название типа материала' }, { status: 400 })
    }
    const materialType = await db.materialType.create({
      data: {
        name: name.trim(),
        unit: unit || 'шт',
      },
    })
    return NextResponse.json(materialType, { status: 201 })
  } catch (error: unknown) {
    console.error('Create material type error:', error)
    const prismaError = error as { code?: string }
    if (prismaError.code === 'P2002') {
      return NextResponse.json({ error: 'Тип материала с таким названием уже существует' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Ошибка создания типа материала' }, { status: 500 })
  }
}
