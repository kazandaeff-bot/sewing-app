import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAuth, validateBody, validateParams } from '@/lib/api-auth'
import { UpdateBoxTypeSchema, IdParamSchema } from '@/lib/schemas'

export const PATCH = withAuth(async (req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, UpdateBoxTypeSchema)
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
}, ['supervisor'])

export const DELETE = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    await db.boxType.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete box type error:', error)
    return NextResponse.json({ error: 'Ошибка удаления типа короба' }, { status: 500 })
  }
}, ['supervisor'])
