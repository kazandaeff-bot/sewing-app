import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAuth, validateBody, validateParams } from '@/lib/api-auth'
import { UpdateMaterialSchema, IdParamSchema } from '@/lib/schemas'

export const PATCH = withAuth(async (req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, UpdateMaterialSchema)
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
}, ['supervisor'])

export const DELETE = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    await db.material.delete({ where: { id } })
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Delete material error:', error)
    return NextResponse.json({ error: 'Ошибка удаления материала' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}, ['supervisor'])
