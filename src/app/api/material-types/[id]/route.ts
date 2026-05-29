import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAuth, validateBody, validateParams } from '@/lib/api-auth'
import { UpdateMaterialTypeSchema, IdParamSchema } from '@/lib/schemas'

export const PATCH = withAuth(async (req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, UpdateMaterialTypeSchema)
    if ('error' in result) return result.error

    const type = await db.materialType.update({ where: { id }, data: result.data, include: { materials: true } })
    return NextResponse.json(type, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Update material type error:', error)
    return NextResponse.json({ error: 'Ошибка обновления типа материала' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}, ['supervisor'])

export const DELETE = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    await db.materialType.delete({ where: { id } })
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Delete material type error:', error)
    return NextResponse.json({ error: 'Ошибка удаления типа материала' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}, ['supervisor'])
