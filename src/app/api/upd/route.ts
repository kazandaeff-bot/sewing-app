import { db } from '@/lib/db'
import { withAuth, validateBody } from '@/lib/api-auth'
import { CreateUPDSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withAuth(async (req, ctx, user) => {
  try {
    const upds = await db.uPD.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        customer: true,
        invoice: true,
      },
    })
    return NextResponse.json(upds, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Get UPDs error:', error)
    return NextResponse.json(
      { error: 'Ошибка получения списка УПД' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor'])

export const POST = withAuth(async (req, ctx, user) => {
  try {
    const result = await validateBody(req, CreateUPDSchema)
    if ('error' in result) return result.error

    const { number, date, customerId, invoiceId, sellerPlanId, status, operationType, note, items, vatRate } = result.data

    // Calculate totals from items
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
    const vatAmount = totalAmount * vatRate / 100

    const upd = await db.uPD.create({
      data: {
        number,
        date: date ? new Date(date) : undefined,
        customerId,
        invoiceId: invoiceId || undefined,
        sellerPlanId: sellerPlanId || undefined,
        status,
        operationType,
        note: note || undefined,
        totalAmount,
        vatRate,
        vatAmount,
        createdBy: user.id,
        items: {
          create: items.map((item) => ({
            productId: item.productId || undefined,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            amount: item.amount,
            vatRate: item.vatRate,
            vatAmount: item.vatAmount,
          })),
        },
      },
      include: {
        items: true,
        customer: true,
        invoice: true,
      },
    })

    return NextResponse.json(upd, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'УПД с таким номером уже существует' },
        { status: 409, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    console.error('Create UPD error:', error)
    return NextResponse.json(
      { error: 'Ошибка создания УПД' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor'])
