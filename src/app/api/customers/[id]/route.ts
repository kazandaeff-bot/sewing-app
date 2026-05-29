import { db } from '@/lib/db'
import { validateBody } from '@/lib/api-auth'
import { UpdateCustomerSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await validateBody(request, UpdateCustomerSchema)
    if ('error' in result) return result.error

    const customer = await db.customer.update({
      where: { id },
      data: result.data,
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
