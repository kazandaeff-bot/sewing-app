import { db } from '@/lib/db'
import { withAuth, validateParams } from '@/lib/api-auth'
import { IdParamSchema } from '@/lib/schemas'
import { NextResponse } from 'next/server'

export const DELETE = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    await db.city.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete city error:', error)
    return NextResponse.json({ error: 'Ошибка удаления города' }, { status: 500 })
  }
}, ['supervisor'])
