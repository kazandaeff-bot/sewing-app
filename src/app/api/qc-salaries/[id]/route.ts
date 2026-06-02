import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAuth, validateParams } from '@/lib/api-auth'
import { IdParamSchema } from '@/lib/schemas'

// GET /api/qc-salaries/[id] — get single QC salary record
export const GET = withAuth(async (_req, ctx) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const salary = await db.qcSalary.findUnique({
      where: { id },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            customer: { select: { id: true, name: true } },
          },
        },
        employee: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, article: true } },
          },
        },
      },
    })

    if (!salary) {
      return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 })
    }

    return NextResponse.json(salary)
  } catch (error) {
    console.error('Get QC salary error:', error)
    return NextResponse.json({ error: 'Ошибка получения записи' }, { status: 500 })
  }
}, ['supervisor'])

// PATCH /api/qc-salaries/[id] — update salary status (mark as paid)
export const PATCH = withAuth(async (req, ctx) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const body = await req.json()
    const { status } = body as { status?: string }

    const existing = await db.qcSalary.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Запись не найдена' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status === 'paid') {
      updateData.status = 'paid'
      updateData.paidAt = new Date()
    } else if (status === 'calculated') {
      // Allow reverting from paid to calculated
      updateData.status = 'calculated'
      updateData.paidAt = null
    }

    const updated = await db.qcSalary.update({
      where: { id },
      data: updateData,
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            customer: { select: { id: true, name: true } },
          },
        },
        employee: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, article: true } },
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update QC salary error:', error)
    return NextResponse.json({ error: 'Ошибка обновления записи' }, { status: 500 })
  }
}, ['supervisor'])
