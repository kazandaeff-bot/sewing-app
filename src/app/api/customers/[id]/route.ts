import { db } from '@/lib/db'
import { withAuth, validateParams, validateBody } from '@/lib/api-auth'
import { IdParamSchema, UpdateCustomerSchema } from '@/lib/schemas'
import { NextResponse } from 'next/server'

export const PATCH = withAuth(async (req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, UpdateCustomerSchema)
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
}, ['supervisor'])

export const DELETE = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    await db.customer.delete({ where: { id } })
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Delete customer error:', error)
    return NextResponse.json({ error: 'Ошибка удаления заказчика' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}, ['supervisor'])
