import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, contactInfo, showMaterialBalance } = body
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (contactInfo !== undefined) updateData.contactInfo = contactInfo
    if (showMaterialBalance !== undefined) updateData.showMaterialBalance = showMaterialBalance

    const customer = await db.customer.update({
      where: { id },
      data: updateData,
      include: { customerProducts: { include: { product: true } }, employees: true },
    })
    return NextResponse.json(customer, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Update customer error:', error)
    return NextResponse.json({ error: 'Ошибка обновления заказчика' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.customer.delete({ where: { id } })
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Delete customer error:', error)
    return NextResponse.json({ error: 'Ошибка удаления заказчика' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
