import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { validateBody } from '@/lib/api-auth'
import { UpdateCuttingLeftoverSchema } from '@/lib/schemas'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await validateBody(request, UpdateCuttingLeftoverSchema)
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
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.cuttingLeftover.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete cutting leftover error:', error)
    return NextResponse.json({ error: 'Ошибка удаления остатка кроя' }, { status: 500 })
  }
}
