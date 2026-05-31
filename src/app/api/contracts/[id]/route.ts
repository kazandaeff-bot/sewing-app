import { db } from '@/lib/db'
import { withAuth, validateBody, validateParams } from '@/lib/api-auth'
import { UpdateContractSchema, IdParamSchema } from '@/lib/schemas'
import { NextResponse } from 'next/server'

export const GET = withAuth(async (req, ctx, user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const contract = await db.contract.findUnique({
      where: { id },
      include: { customer: true },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Договор не найден' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
    }

    return NextResponse.json(contract, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Get contract error:', error)
    return NextResponse.json({ error: 'Ошибка получения договора' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}, ['supervisor'])

export const PATCH = withAuth(async (req, ctx, user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, UpdateContractSchema)
    if ('error' in result) return result.error

    const data = result.data

    // Build update data for scalar fields
    const updateData: Record<string, unknown> = {}
    if (data.number !== undefined) updateData.number = data.number
    if (data.date !== undefined) updateData.date = data.date ? new Date(data.date) : new Date()
    if (data.customerId !== undefined) updateData.customerId = data.customerId
    if (data.type !== undefined) updateData.type = data.type
    if (data.status !== undefined) updateData.status = data.status
    if (data.subject !== undefined) updateData.subject = data.subject
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.vatRate !== undefined) updateData.vatRate = data.vatRate
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null
    if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms
    if (data.deliveryTerms !== undefined) updateData.deliveryTerms = data.deliveryTerms
    if (data.note !== undefined) updateData.note = data.note
    if (data.planId !== undefined) updateData.planId = data.planId
    if (data.invoiceId !== undefined) updateData.invoiceId = data.invoiceId

    // Recalculate VAT amount if amount or vatRate changed
    if (data.amount !== undefined || data.vatRate !== undefined) {
      const existing = await db.contract.findUnique({ where: { id } })
      if (existing) {
        const effectiveAmount = data.amount !== undefined ? data.amount : existing.amount
        const effectiveVatRate = data.vatRate !== undefined ? data.vatRate : existing.vatRate
        updateData.vatAmount = effectiveAmount != null && effectiveVatRate > 0
          ? effectiveAmount * effectiveVatRate / 100
          : null
      }
    }

    const contract = await db.contract.update({
      where: { id },
      data: updateData,
      include: { customer: true },
    })

    return NextResponse.json(contract, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Договор не найден' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
    }
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Договор с таким номером уже существует' }, { status: 409, headers: { 'Cache-Control': 'no-store' } })
    }
    console.error('Update contract error:', error)
    return NextResponse.json({ error: 'Ошибка обновления договора' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}, ['supervisor'])

export const DELETE = withAuth(async (req, ctx, user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    await db.contract.delete({ where: { id } })

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Договор не найден' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
    }
    console.error('Delete contract error:', error)
    return NextResponse.json({ error: 'Ошибка удаления договора' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}, ['supervisor'])
