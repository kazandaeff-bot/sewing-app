import { db } from '@/lib/db'
import { validateBody } from '@/lib/api-auth'
import { UpdateMaterialTypeSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await validateBody(request, UpdateMaterialTypeSchema)
    if ('error' in result) return result.error

    const type = await db.materialType.update({ where: { id }, data: result.data, include: { materials: true } })
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
