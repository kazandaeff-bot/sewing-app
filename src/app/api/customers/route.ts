import { db, EMPLOYEE_PUBLIC_INCLUDE } from '@/lib/db'
import { withAuth, validateBody } from '@/lib/api-auth'
import { CreateCustomerSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withAuth(async (req, ctx, user) => {
  try {
    const customers = await db.customer.findMany({
      orderBy: { name: 'asc' },
      include: { customerProducts: { include: { product: true } }, employees: EMPLOYEE_PUBLIC_INCLUDE, plans: true, sellerPlans: true },
    })
    return NextResponse.json(customers, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Get customers error:', error)
    return NextResponse.json({ error: 'Ошибка получения списка заказчиков' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}, ['supervisor'])

export const POST = withAuth(async (req, ctx, user) => {
  try {
    const result = await validateBody(req, CreateCustomerSchema)
    if ('error' in result) return result.error
    const { name, type, inn, kpp, legalAddress, postalAddress, phone, email, bankName, bik, checkingAccount, corrAccount, bankCity, contactInfo } = result.data
    const customer = await db.customer.create({
      data: {
        name,
        type: type || 'organization',
        inn: inn || null,
        kpp: kpp || null,
        legalAddress: legalAddress || null,
        postalAddress: postalAddress || null,
        phone: phone || null,
        email: email || null,
        bankName: bankName || null,
        bik: bik || null,
        checkingAccount: checkingAccount || null,
        corrAccount: corrAccount || null,
        bankCity: bankCity || null,
        contactInfo: contactInfo || null,
      },
      include: { customerProducts: true, employees: EMPLOYEE_PUBLIC_INCLUDE },
    })
    return NextResponse.json(customer, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Заказчик с таким названием уже существует' }, { status: 409, headers: { 'Cache-Control': 'no-store' } })
    }
    console.error('Create customer error:', error)
    return NextResponse.json({ error: 'Ошибка создания заказчика' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}, ['supervisor'])
