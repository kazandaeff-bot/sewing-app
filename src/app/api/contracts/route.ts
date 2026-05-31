import { db } from '@/lib/db'
import { withAuth, validateBody } from '@/lib/api-auth'
import { CreateContractSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withAuth(async (req, ctx, user) => {
  try {
    const contracts = await db.contract.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
      },
    })
    return NextResponse.json(contracts, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Get contracts error:', error)
    return NextResponse.json({ error: 'Ошибка получения списка договоров' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}, ['supervisor'])

export const POST = withAuth(async (req, ctx, user) => {
  try {
    const result = await validateBody(req, CreateContractSchema)
    if ('error' in result) return result.error

    const {
      number, date, customerId, type, status,
      subject, amount, vatRate, startDate, endDate,
      paymentTerms, deliveryTerms, note, planId, invoiceId,
    } = result.data

    // Calculate VAT amount (-1 = Без НДС, 0 = 0% НДС)
    const vatAmount = amount != null && vatRate > 0 ? amount * vatRate / 100 : null

    const contract = await db.contract.create({
      data: {
        number,
        date: date ? new Date(date) : new Date(),
        customerId,
        type,
        status,
        subject: subject || null,
        amount: amount ?? null,
        vatRate,
        vatAmount,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        paymentTerms: paymentTerms || null,
        deliveryTerms: deliveryTerms || null,
        note: note || null,
        planId: planId || null,
        invoiceId: invoiceId || null,
      },
      include: { customer: true },
    })

    return NextResponse.json(contract, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Договор с таким номером уже существует' }, { status: 409, headers: { 'Cache-Control': 'no-store' } })
    }
    console.error('Create contract error:', error)
    return NextResponse.json({ error: 'Ошибка создания договора' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}, ['supervisor'])
