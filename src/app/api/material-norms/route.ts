import { db } from '@/lib/db'
import { validateBody } from '@/lib/api-auth'
import { CreateMaterialNormSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const norms = await db.materialNorm.findMany({
      orderBy: { productId: 'asc' },
      include: { material: true, product: true },
    })
    return NextResponse.json(norms, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Get material norms error:', error)
    return NextResponse.json({ error: 'Ошибка получения норм расходов' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await validateBody(request, CreateMaterialNormSchema)
    if ('error' in result) return result.error
    const { materialId, productId, consumptionPerUnit, unit, autoCalculated } = result.data
    const norm = await db.materialNorm.create({
      data: {
        materialId,
        productId,
        consumptionPerUnit,
        unit,
        autoCalculated,
      },
      include: { material: true, product: true },
    })
    return NextResponse.json(norm, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Норма расхода для этого материала и изделия уже существует' }, { status: 409, headers: { 'Cache-Control': 'no-store' } })
    }
    console.error('Create material norm error:', error)
    return NextResponse.json({ error: 'Ошибка создания нормы расхода' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Укажите ID нормы' }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }
    await db.materialNorm.delete({ where: { id } })
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Delete material norm error:', error)
    return NextResponse.json({ error: 'Ошибка удаления нормы расхода' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
