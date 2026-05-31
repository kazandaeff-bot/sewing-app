import { db } from '@/lib/db'
import { withAuth, validateBody } from '@/lib/api-auth'
import { CreateDealSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withAuth(async (_req, _ctx, _user) => {
  try {
    const deals = await db.deal.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        contacts: { orderBy: { date: 'desc' } },
      },
    })
    return NextResponse.json(deals, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Get deals error:', error)
    return NextResponse.json(
      { error: 'Ошибка получения списка сделок' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor'])

export const POST = withAuth(async (req, _ctx, _user) => {
  try {
    const result = await validateBody(req, CreateDealSchema)
    if ('error' in result) return result.error

    const { title, customerId, status, amount, description, result: dealResult, nextStep, deadline } = result.data

    const deal = await db.deal.create({
      data: {
        title,
        customerId,
        status,
        amount: amount ?? null,
        description: description || null,
        result: dealResult || null,
        nextStep: nextStep || null,
        deadline: deadline ?? null,
      },
      include: {
        customer: true,
        contacts: true,
      },
    })
    return NextResponse.json(deal, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Указанный заказчик не найден' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    console.error('Create deal error:', error)
    return NextResponse.json(
      { error: 'Ошибка создания сделки' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor'])
