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

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name.trim()
    if (unit !== undefined) data.unit = unit

    const materialType = await db.materialType.update({
      where: { id },
      data,
    })
    return NextResponse.json(materialType)
  } catch (error: unknown) {
    console.error('Update material type error:', error)
    const prismaError = error as { code?: string }
    if (prismaError.code === 'P2002') {
      return NextResponse.json({ error: 'Тип материала с таким названием уже существует' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Ошибка обновления типа материала' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.materialType.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete material type error:', error)
    return NextResponse.json({ error: 'Ошибка удаления типа материала' }, { status: 500 })
  }
}
