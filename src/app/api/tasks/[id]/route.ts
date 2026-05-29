import { db } from '@/lib/db'
import { withAuth, validateParams, validateBody } from '@/lib/api-auth'
import { IdParamSchema, UpdateTaskSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export const PATCH = withAuth(async (req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, UpdateTaskSchema)
    if ('error' in result) return result.error
    const {
      actualQuantity, fabricDefect, defectNote, status,
      colorHex, size, color, quantity, employeeId, productId,
    } = result.data

    const updateData: Record<string, unknown> = {}
    if (actualQuantity !== undefined) updateData.actualQuantity = actualQuantity
    if (fabricDefect !== undefined) updateData.fabricDefect = fabricDefect
    if (defectNote !== undefined) updateData.defectNote = defectNote
    if (colorHex !== undefined) updateData.colorHex = colorHex
    if (size !== undefined) updateData.size = size
    if (color !== undefined) updateData.color = color
    if (quantity !== undefined) updateData.quantity = quantity
    if (employeeId !== undefined) updateData.employeeId = employeeId
    if (productId !== undefined) updateData.productId = productId
    if (status !== undefined) {
      updateData.status = status
      if (status === 'completed') updateData.completedAt = new Date()
      if (status === 'pending_qc') updateData.completedAt = null
      if (status === 'in_progress') updateData.completedAt = null
    }

    const task = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        employee: true,
        product: true,
        reworks: true,
      },
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Update task error:', error)
    return NextResponse.json({ error: 'Ошибка обновления задания' }, { status: 500 })
  }
}, ['supervisor', 'sewer'])

export const DELETE = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    await db.task.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json({ error: 'Ошибка удаления задания' }, { status: 500 })
  }
}, ['supervisor'])
