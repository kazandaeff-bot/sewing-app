import { db } from '@/lib/db'
import { validateBody } from '@/lib/api-auth'
import { UpdateBoxTypeSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await validateBody(request, UpdateBoxTypeSchema)
    if ('error' in result) return result.error
    const { name, dimensions, capacities } = result.data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (dimensions !== undefined) updateData.dimensions = dimensions

    // Replace capacities if provided
    if (capacities !== undefined) {
      await db.boxCapacity.deleteMany({ where: { boxTypeId: id } })
      if (capacities.length > 0) {
        updateData.capacities = {
          create: capacities.map((c) => ({
            productId: c.productId,
            size: c.size,
            maxQty: c.maxQty,
          }))
        }
      }
    }

    const boxType = await db.boxType.update({
      where: { id },
      data: updateData,
      include: { capacities: { include: { product: true } } },
    })
    return NextResponse.json(boxType)
  } catch (error) {
    console.error('Update box type error:', error)
    return NextResponse.json({ error: 'Ошибка обновления типа короба' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.boxType.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete box type error:', error)
    return NextResponse.json({ error: 'Ошибка удаления типа короба' }, { status: 500 })
  }
}