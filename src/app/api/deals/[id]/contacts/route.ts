import { db } from '@/lib/db'
import { withAuth, validateParams, validateBody } from '@/lib/api-auth'
import { IdParamSchema, CreateDealContactSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const contacts = await db.dealContact.findMany({
      where: { dealId: id },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(contacts, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Get deal contacts error:', error)
    return NextResponse.json(
      { error: 'Ошибка получения контактов сделки' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor'])

export const POST = withAuth(async (req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, CreateDealContactSchema)
    if ('error' in result) return result.error

    const { date, type, result: contactResult, description, nextStep } = result.data

    const contact = await db.dealContact.create({
      data: {
        dealId: id,
        date: date || new Date().toISOString(),
        type,
        result: contactResult || null,
        description: description || null,
        nextStep: nextStep || null,
      },
    })
    return NextResponse.json(contact, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Сделка не найдена' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    console.error('Create deal contact error:', error)
    return NextResponse.json(
      { error: 'Ошибка создания контакта сделки' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor'])
