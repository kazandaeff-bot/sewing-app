import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { consumptionPerUnit, unit, autoCalculated } = body

    const data: Record<string, unknown> = {}
    if (consumptionPerUnit !== undefined) data.consumptionPerUnit = consumptionPerUnit
    if (unit !== undefined) data.unit = unit
    if (autoCalculated !== undefined) data.autoCalculated = autoCalculated

    const norm = await db.materialNorm.update({
      where: { id },
      data,
      include: {
        material: { include: { materialType: true } },
        product: true,
      },
    })
    return NextResponse.json(norm)
  } catch (error) {
    console.error('Update material norm error:', error)
    return NextResponse.json({ error: 'Ошибка обновления нормы расхода' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.materialNorm.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete material norm error:', error)
    return NextResponse.json({ error: 'Ошибка удаления нормы расхода' }, { status: 500 })
  }
}
