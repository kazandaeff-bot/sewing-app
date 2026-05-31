import { db } from '@/lib/db'
import { withAuth, validateBody, validateParams } from '@/lib/api-auth'
import { UpdateInvoiceSchema, IdParamSchema } from '@/lib/schemas'
import { NextResponse } from 'next/server'

export const GET = withAuth(async (req, ctx, user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { items: true, customer: true },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Счёт не найден' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
    }

    return NextResponse.json(invoice, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Get invoice error:', error)
    return NextResponse.json({ error: 'Ошибка получения счёта' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}, ['supervisor'])

export const PATCH = withAuth(async (req, ctx, user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, UpdateInvoiceSchema)
    if ('error' in result) return result.error

    const { number, date, customerId, planId, status, dueDate, note, items, vatRate } = result.data

    // Build update data for scalar fields
    const updateData: Record<string, unknown> = {}
    if (number !== undefined) updateData.number = number
    if (date !== undefined) updateData.date = date
    if (customerId !== undefined) updateData.customerId = customerId
    if (planId !== undefined) updateData.planId = planId
    if (status !== undefined) updateData.status = status
    if (dueDate !== undefined) updateData.dueDate = dueDate
    if (note !== undefined) updateData.note = note
    if (vatRate !== undefined) updateData.vatRate = vatRate

    // If items are provided, replace them and recalculate totals
    if (items !== undefined) {
      // Delete existing items
      await db.invoiceItem.deleteMany({ where: { invoiceId: id } })

      // Calculate new totals
      const effectiveVatRate = vatRate !== undefined ? vatRate : (await db.invoice.findUnique({ where: { id }, select: { vatRate: true } }))?.vatRate ?? 20
      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
      const vatAmount = totalAmount * effectiveVatRate / 100

      updateData.totalAmount = totalAmount
      updateData.vatAmount = vatAmount

      // Create new items
      if (items.length > 0) {
        updateData.items = {
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
        }
      }
    } else if (vatRate !== undefined) {
      // vatRate changed but items not provided — recalculate totals from existing items
      const existing = await db.invoice.findUnique({
        where: { id },
        include: { items: true },
      })
      if (existing) {
        const totalAmount = existing.items.reduce((sum, item) => sum + item.amount, 0)
        const vatAmount = totalAmount * vatRate / 100
        updateData.totalAmount = totalAmount
        updateData.vatAmount = vatAmount
      }
    }

    const invoice = await db.invoice.update({
      where: { id },
      data: updateData,
      include: { items: true, customer: true },
    })

    return NextResponse.json(invoice, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Счёт не найден' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
    }
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Счёт с таким номером уже существует' }, { status: 409, headers: { 'Cache-Control': 'no-store' } })
    }
    console.error('Update invoice error:', error)
    return NextResponse.json({ error: 'Ошибка обновления счёта' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}, ['supervisor'])

export const DELETE = withAuth(async (req, ctx, user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    // Delete items first (though cascading should handle it, be explicit)
    await db.invoiceItem.deleteMany({ where: { invoiceId: id } })
    await db.invoice.delete({ where: { id } })

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Счёт не найден' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
    }
    console.error('Delete invoice error:', error)
    return NextResponse.json({ error: 'Ошибка удаления счёта' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}, ['supervisor'])
