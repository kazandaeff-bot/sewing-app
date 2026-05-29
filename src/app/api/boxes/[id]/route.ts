import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAuth, validateBody, validateParams } from '@/lib/api-auth'
import { UpdateBoxSchema, IdParamSchema } from '@/lib/schemas'

export const GET = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const box = await db.box.findUnique({
      where: { id },
      include: {
        sellerPlan: { select: { id: true, sellerName: true } },
        items: { include: { product: true } },
      },
    })
    if (!box) {
      return NextResponse.json({ error: 'Короб не найден' }, { status: 404 })
    }
    return NextResponse.json(box)
  } catch (error) {
    console.error('Get box error:', error)
    return NextResponse.json({ error: 'Ошибка получения короба' }, { status: 500 })
  }
}, ['supervisor', 'seller'])

export const PATCH = withAuth(async (req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, UpdateBoxSchema)
    if ('error' in result) return result.error
    const { status, items } = result.data

    const existing = await db.box.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Короб не найден' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status

    // Update actualQty on items
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.id && item.actualQty !== undefined) {
          await db.boxItem.update({
            where: { id: item.id },
            data: { actualQty: item.actualQty },
          })
        }
      }
    }

    const updated = await db.box.update({
      where: { id },
      data: updateData,
      include: {
        sellerPlan: { select: { id: true, sellerName: true } },
        items: { include: { product: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update box error:', error)
    return NextResponse.json({ error: 'Ошибка обновления короба' }, { status: 500 })
  }
}, ['supervisor', 'seller'])
