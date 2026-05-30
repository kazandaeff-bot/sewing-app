import { db } from '@/lib/db'
import { withAuth, validateBody } from '@/lib/api-auth'
import { CreateInvoiceSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withAuth(async (req, ctx, user) => {
  try {
    const invoices = await db.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        customer: true,
      },
    })
    return NextResponse.json(invoices, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Get invoices error:', error)
    return NextResponse.json({ error: 'Ошибка получения списка счетов' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}, ['supervisor'])

export const POST = withAuth(async (req, ctx, user) => {
  try {
    const result = await validateBody(req, CreateInvoiceSchema)
    if ('error' in result) return result.error

    const { number, date, customerId, planId, status, dueDate, note, items, vatRate } = result.data

    // Calculate totals from items
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
    const vatAmount = totalAmount * vatRate / 100

    const invoice = await db.invoice.create({
      data: {
        number,
        date: date || new Date().toISOString(),
        customerId,
        planId: planId || null,
        status,
        dueDate: dueDate || null,
        note: note || null,
        vatRate,
        totalAmount,
        vatAmount,
        items: {
          create: items.map((item) => ({
            productId: item.productId || null,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            amount: item.amount,
            vatRate: item.vatRate ?? null,
            vatAmount: item.vatAmount ?? null,
          })),
        },
      },
      include: { items: true, customer: true },
    })

    return NextResponse.json(invoice, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Счёт с таким номером уже существует' }, { status: 409, headers: { 'Cache-Control': 'no-store' } })
    }
    console.error('Create invoice error:', error)
    return NextResponse.json({ error: 'Ошибка создания счёта' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}, ['supervisor'])
