import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      actualQuantity, fabricDefect, defectNote, status,
      colorHex, size, color, quantity, employeeId, productId,
    } = body

    const updateData: Record<string, unknown> = {}
    if (actualQuantity !== undefined) updateData.actualQuantity = parseInt(actualQuantity)
    if (fabricDefect !== undefined) updateData.fabricDefect = parseInt(fabricDefect)
    if (defectNote !== undefined) updateData.defectNote = defectNote
    if (colorHex !== undefined) updateData.colorHex = colorHex
    if (size !== undefined) updateData.size = size
    if (color !== undefined) updateData.color = color
    if (quantity !== undefined) updateData.quantity = parseInt(quantity)
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
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.task.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json({ error: 'Ошибка удаления задания' }, { status: 500 })
  }
}