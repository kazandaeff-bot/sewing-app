import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAuth, validateParams } from '@/lib/api-auth'
import { IdParamSchema } from '@/lib/schemas'

export const DELETE = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    // Find the entry first to reverse the stock change
    const entry = await db.materialEntry.findUnique({ where: { id } })
    if (!entry) {
      return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 })
    }

    // Reverse the stock change
    const material = await db.material.findUnique({ where: { id: entry.materialId } })
    if (material) {
      const qtyChange = entry.type === 'incoming' ? -entry.qty : entry.qty
      await db.material.update({
        where: { id: entry.materialId },
        data: { totalQty: Math.max(0, material.totalQty + qtyChange) },
      })
    }

    // Delete the entry
    await db.materialEntry.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete material entry error:', error)
    return NextResponse.json({ error: 'Ошибка удаления записи' }, { status: 500 })
  }
}, ['supervisor'])
