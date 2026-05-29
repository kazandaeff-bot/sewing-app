import { db } from '@/lib/db'
import { validateBody } from '@/lib/api-auth'
import { CreateCustomerSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const customers = await db.customer.findMany({
      orderBy: { name: 'asc' },
      include: { customerProducts: { include: { product: true } }, employees: true, plans: true, sellerPlans: true },
    })
    return NextResponse.json(customers, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Get customers error:', error)
    return NextResponse.json({ error: 'Ошибка получения списка заказчиков' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await validateBody(request, CreateCustomerSchema)
    if ('error' in result) return result.error
    const { name, contactInfo } = result.data
    const customer = await db.customer.create({
      data: { name, contactInfo: contactInfo || null },
      include: { customerProducts: true, employees: true },
    })
    return NextResponse.json(customer, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Заказчик с таким названием уже существует' }, { status: 409, headers: { 'Cache-Control': 'no-store' } })
    }
    console.error('Create customer error:', error)
    return NextResponse.json({ error: 'Ошибка создания заказчика' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
