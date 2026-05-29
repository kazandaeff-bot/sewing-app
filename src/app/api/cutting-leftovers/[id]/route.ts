import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAuth, validateBody, validateParams } from '@/lib/api-auth'
import { UpdateCuttingLeftoverSchema, IdParamSchema } from '@/lib/schemas'

export const GET = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const leftover = await db.cuttingLeftover.findUnique({
      where: { id },
      include: {
        product: true,
        cuttingPlan: {
          include: {
            plan: {
              select: { id: true, name: true, customer: { select: { id: true, name: true } } },
            },
          },
        },
      },
    })
    if (!leftover) {
      return NextResponse.json({ error: 'Остаток не найден' }, { status: 404 })
    }
    return NextResponse.json(leftover)
  } catch (error) {
    console.error('Get cutting leftover error:', error)
    return NextResponse.json({ error: 'Ошибка получения остатка кроя' }, { status: 500 })
  }
}, ['supervisor', 'cutter'])

export const PATCH = withAuth(async (req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, UpdateCuttingLeftoverSchema)
    if ('error' in result) return result.error
    const { sewnQty, status, note, quantity } = result.data

    const existing = await db.cuttingLeftover.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Остаток не найден' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (sewnQty !== undefined) {
      updateData.sewnQty = sewnQty
      // Auto-update status based on sewnQty vs quantity
      if (sewnQty >= existing.quantity) {
        updateData.status = 'fully_sewn'
      } else if (sewnQty > 0) {
        updateData.status = 'partially_sewn'
      }
    }
    if (status) updateData.status = status
    if (note !== undefined) updateData.note = note
    if (quantity !== undefined) updateData.quantity = quantity

    const updated = await db.cuttingLeftover.update({
      where: { id },
      data: updateData,
      include: {
        product: true,
        cuttingPlan: {
          include: {
            plan: {
              select: { id: true, name: true, customer: { select: { id: true, name: true } } },
            },
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update cutting leftover error:', error)
    return NextResponse.json({ error: 'Ошибка обновления остатка кроя' }, { status: 500 })
  }
}, ['supervisor', 'cutter'])

export const DELETE = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    await db.cuttingLeftover.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete cutting leftover error:', error)
    return NextResponse.json({ error: 'Ошибка удаления остатка кроя' }, { status: 500 })
  }
}, ['supervisor'])
