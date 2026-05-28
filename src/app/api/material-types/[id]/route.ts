import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, unit } = body
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (unit !== undefined) updateData.unit = unit

    const type = await db.materialType.update({ where: { id }, data: updateData, include: { materials: true } })
    return NextResponse.json(type, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Update material type error:', error)
    return NextResponse.json({ error: 'Ошибка обновления типа материала' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.materialType.delete({ where: { id } })
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Delete material type error:', error)
    return NextResponse.json({ error: 'Ошибка удаления типа материала' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
