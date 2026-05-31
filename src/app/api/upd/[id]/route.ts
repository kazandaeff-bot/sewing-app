import { db } from '@/lib/db'
import { withAuth, validateParams, validateBody } from '@/lib/api-auth'
import { IdParamSchema, UpdateUPDSchema } from '@/lib/schemas'
import { NextResponse } from 'next/server'

const headers = { 'Cache-Control': 'no-store' }

export const GET = withAuth(async (req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const upd = await db.uPD.findUnique({
      where: { id },
      include: {
        items: true,
        customer: true,
        invoice: true,
      },
    })

    if (!upd) {
      return NextResponse.json({ error: 'УПД не найден' }, { status: 404, headers })
    }

    return NextResponse.json(upd, { headers })
  } catch (error) {
    console.error('Get UPD error:', error)
    return NextResponse.json({ error: 'Ошибка получения УПД' }, { status: 500, headers })
  }
}, ['supervisor'])

export const PATCH = withAuth(async (req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, UpdateUPDSchema)
    if ('error' in result) return result.error

    const { number, date, customerId, invoiceId, sellerPlanId, status, operationType, note, items, vatRate } = result.data

    // If items are provided, recalculate totals and replace them
    if (items) {
      // Fetch current vatRate if not being updated
      const current = await db.uPD.findUnique({ where: { id }, select: { vatRate: true } })
      if (!current) {
        return NextResponse.json({ error: 'УПД не найден' }, { status: 404, headers })
      }

      const effectiveVatRate = vatRate ?? current.vatRate
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
      const vatAmount = totalAmount * effectiveVatRate / 100

      // Delete existing items and recreate them
      await db.uPDItem.deleteMany({ where: { updId: id } })

      const upd = await db.uPD.update({
        where: { id },
        data: {
          number,
          date: date !== undefined ? (date ? new Date(date) : undefined) : undefined,
          customerId,
          invoiceId,
          sellerPlanId,
          status,
          operationType,
          note,
          vatRate,
          totalAmount,
          vatAmount,
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

      return NextResponse.json(upd, { headers })
    }

    // No items change — just update scalar fields (and vatRate if provided)
    if (vatRate !== undefined) {
      // Recalculate vatAmount with new vatRate but existing totalAmount
      const current = await db.uPD.findUnique({ where: { id }, select: { totalAmount: true } })
      if (!current) {
        return NextResponse.json({ error: 'УПД не найден' }, { status: 404, headers })
      }
      const vatAmount = current.totalAmount * vatRate / 100

      const upd = await db.uPD.update({
        where: { id },
        data: {
          number,
          date: date !== undefined ? (date ? new Date(date) : undefined) : undefined,
          customerId,
          invoiceId,
          sellerPlanId,
          status,
          operationType,
          note,
          vatRate,
          vatAmount,
        },
        include: {
          items: true,
          customer: true,
          invoice: true,
        },
      })

      return NextResponse.json(upd, { headers })
    }

    // Simple update without totals recalculation
    const upd = await db.uPD.update({
      where: { id },
      data: {
        number,
        date: date !== undefined ? (date ? new Date(date) : undefined) : undefined,
        customerId,
        invoiceId,
        sellerPlanId,
        status,
        operationType,
        note,
      },
      include: {
        items: true,
        customer: true,
        invoice: true,
      },
    })

    return NextResponse.json(upd, { headers })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'УПД с таким номером уже существует' },
        { status: 409, headers },
      )
    }
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'УПД не найден' }, { status: 404, headers })
    }
    console.error('Update UPD error:', error)
    return NextResponse.json({ error: 'Ошибка обновления УПД' }, { status: 500, headers })
  }
}, ['supervisor'])

export const DELETE = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    await db.uPD.delete({ where: { id } })
    return NextResponse.json({ success: true }, { headers })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'УПД не найден' }, { status: 404, headers })
    }
    console.error('Delete UPD error:', error)
    return NextResponse.json({ error: 'Ошибка удаления УПД' }, { status: 500, headers })
  }
}, ['supervisor'])
