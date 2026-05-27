import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const material = await db.material.findUnique({
      where: { id },
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
    if (!material) {
      return NextResponse.json({ error: 'Материал не найден' }, { status: 404 })
    }
    return NextResponse.json(material)
  } catch (error) {
    console.error('Get material error:', error)
    return NextResponse.json({ error: 'Ошибка получения материала' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, totalQty } = body

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name.trim()
    if (totalQty !== undefined) data.totalQty = totalQty

    const material = await db.material.update({
      where: { id },
      data,
      include: { materialType: true },
    })
    return NextResponse.json(material)
  } catch (error) {
    console.error('Update material error:', error)
    return NextResponse.json({ error: 'Ошибка обновления материала' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.material.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete material error:', error)
    return NextResponse.json({ error: 'Ошибка удаления материала' }, { status: 500 })
  }
}
