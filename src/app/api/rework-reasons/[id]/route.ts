import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAuth, validateParams } from '@/lib/api-auth'
import { IdParamSchema } from '@/lib/schemas'

export const DELETE = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    await db.reworkReason.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete rework reason error:', error)
    return NextResponse.json({ error: 'Ошибка удаления причины переделки' }, { status: 500 })
  }
}, ['supervisor'])
