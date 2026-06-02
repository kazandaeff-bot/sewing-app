import { db } from '@/lib/db'
import { withAuth, validateBody, validateQuery } from '@/lib/api-auth'
import { CreateReworkSchema, ReworksQuerySchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withAuth(async (req, ctx, user) => {
  try {
    const q = validateQuery(req, ReworksQuerySchema)
    if ('error' in q) return q.error
    const { status } = q.data

    const where: Record<string, unknown> = {}
    if (status) where.status = status

    const reworks = await db.rework.findMany({
      where,
      include: {
        task: {
          include: {
            employee: true,
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(reworks)
  } catch (error) {
    console.error('Get reworks error:', error)
    return NextResponse.json({ error: 'Ошибка получения переделок' }, { status: 500 })
  }
}, ['supervisor', 'qc'])

export const POST = withAuth(async (req, ctx, user) => {
  try {
    const result = await validateBody(req, CreateReworkSchema)
    if ('error' in result) return result.error
    const { taskId, quantity, reason } = result.data

    const rework = await db.rework.create({
      data: {
        taskId,
        quantity,
        reason,
      },
      include: {
        task: {
          include: {
            employee: true,
            product: true,
          },
        },
      },
    })

    return NextResponse.json(rework, { status: 201 })
  } catch (error) {
    console.error('Create rework error:', error)
    return NextResponse.json({ error: 'Ошибка создания переделки' }, { status: 500 })
  }
}, ['supervisor', 'qc'])
