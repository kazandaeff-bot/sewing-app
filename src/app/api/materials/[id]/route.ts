import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, unit, totalQty, materialTypeId } = body
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (unit !== undefined) updateData.unit = unit
    if (totalQty !== undefined) updateData.totalQty = totalQty
    if (materialTypeId !== undefined) updateData.materialTypeId = materialTypeId

    const material = await db.material.update({
      where: { id },
      data: updateData,
      include: { materialType: true, norms: true },
    })
    return NextResponse.json(material, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Update material error:', error)
    return NextResponse.json({ error: 'Ошибка обновления материала' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.material.delete({ where: { id } })
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Delete material error:', error)
    return NextResponse.json({ error: 'Ошибка удаления материала' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
