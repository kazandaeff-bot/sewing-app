import { db } from '@/lib/db'
import { withAuth, validateParams, validateBody } from '@/lib/api-auth'
import { DealContactIdParamSchema, UpdateDealContactSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export const PATCH = withAuth(async (req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, DealContactIdParamSchema)
    if ('error' in p) return p.error
    const { id, contactId } = p.data

    const result = await validateBody(req, UpdateDealContactSchema)
    if ('error' in result) return result.error

    const contact = await db.dealContact.update({
      where: { id: contactId, dealId: id },
      data: result.data,
    })
    return NextResponse.json(contact, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Контакт сделки не найден' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    console.error('Update deal contact error:', error)
    return NextResponse.json(
      { error: 'Ошибка обновления контакта сделки' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor'])

export const DELETE = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, DealContactIdParamSchema)
    if ('error' in p) return p.error
    const { id, contactId } = p.data

    await db.dealContact.delete({
      where: { id: contactId, dealId: id },
    })
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Контакт сделки не найден' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    console.error('Delete deal contact error:', error)
    return NextResponse.json(
      { error: 'Ошибка удаления контакта сделки' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor'])
