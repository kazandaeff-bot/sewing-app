import { db } from '@/lib/db'
import { validateBody } from '@/lib/api-auth'
import { UpdateMaterialSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await validateBody(request, UpdateMaterialSchema)
    if ('error' in result) return result.error

    const material = await db.material.update({
      where: { id },
      data: result.data,
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
