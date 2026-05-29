import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAuth, validateBody, validateParams } from '@/lib/api-auth'
import { UpdateMaterialNormSchema, IdParamSchema } from '@/lib/schemas'

export const PATCH = withAuth(async (req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, UpdateMaterialNormSchema)
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
}, ['supervisor'])

export const DELETE = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    await db.materialNorm.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete material norm error:', error)
    return NextResponse.json({ error: 'Ошибка удаления нормы расхода' }, { status: 500 })
  }
}, ['supervisor'])
