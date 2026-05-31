import { db } from '@/lib/db'
import { withAuth, validateParams, validateBody } from '@/lib/api-auth'
import { IdParamSchema, UpdateDealSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const deal = await db.deal.findUnique({
      where: { id },
      include: {
        customer: true,
        contacts: { orderBy: { date: 'desc' } },
      },
    })
    if (!deal) {
      return NextResponse.json(
        { error: 'Сделка не найдена' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    return NextResponse.json(deal, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Get deal error:', error)
    return NextResponse.json(
      { error: 'Ошибка получения сделки' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor'])

export const PATCH = withAuth(async (req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, UpdateDealSchema)
    if ('error' in result) return result.error

    const deal = await db.deal.update({
      where: { id },
      data: result.data,
      include: {
        customer: true,
        contacts: { orderBy: { date: 'desc' } },
      },
    })
    return NextResponse.json(deal, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Сделка не найдена' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Указанный заказчик не найден' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    console.error('Update deal error:', error)
    return NextResponse.json(
      { error: 'Ошибка обновления сделки' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor'])

export const DELETE = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    await db.deal.delete({ where: { id } })
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Сделка не найдена' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    console.error('Delete deal error:', error)
    return NextResponse.json(
      { error: 'Ошибка удаления сделки' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor'])
