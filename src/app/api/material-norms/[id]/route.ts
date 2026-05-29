import { db } from '@/lib/db'
import { validateBody } from '@/lib/api-auth'
import { UpdateMaterialNormSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await validateBody(request, UpdateMaterialNormSchema)
    if ('error' in result) return result.error

    const norm = await db.materialNorm.update({
      where: { id },
      data: result.data,
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
