import { db, EMPLOYEE_PUBLIC_INCLUDE } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, validateBody, validateQuery } from '@/lib/api-auth'
import { CreateSewingReworkSchema, SewingReworksQuerySchema } from '@/lib/schemas'

export const GET = withAuth(async (req, ctx, user) => {
  try {
    const q = validateQuery(req, SewingReworksQuerySchema)
    if ('error' in q) return q.error
    const { status, sewingTaskId } = q.data

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (sewingTaskId) where.sewingTaskId = sewingTaskId

    const reworks = await db.sewingRework.findMany({
      where,
      include: {
        sewingTaskItem: {
          include: {
            product: true,
            sewingTask: {
              include: { employee: EMPLOYEE_PUBLIC_INCLUDE },
            },
          },
        },
        sewingTask: {
          include: { employee: EMPLOYEE_PUBLIC_INCLUDE },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(reworks)
  } catch (error) {
    console.error('Get sewing reworks error:', error)
    return NextResponse.json({ error: 'Ошибка получения переделок' }, { status: 500 })
  }
}, ['supervisor', 'qc'])

export const POST = withAuth(async (req, ctx, user) => {
  try {
    const result = await validateBody(req, CreateSewingReworkSchema)
    if ('error' in result) return result.error
    const { sewingTaskItemId, sewingTaskId, quantity, reason } = result.data

    // Validate item exists
    const item = await db.sewingTaskItem.findUnique({
      where: { id: sewingTaskItemId },
    })
    if (!item) {
      return NextResponse.json({ error: 'Позиция задания не найдена' }, { status: 404 })
    }

    const rework = await db.sewingRework.create({
      data: {
        sewingTaskItemId,
        sewingTaskId,
        quantity,
        reason,
      },
      include: {
        sewingTaskItem: {
          include: {
            product: true,
            sewingTask: {
              include: { employee: EMPLOYEE_PUBLIC_INCLUDE },
            },
          },
        },
        sewingTask: {
          include: { employee: EMPLOYEE_PUBLIC_INCLUDE },
        },
      },
    })

    return NextResponse.json(rework, { status: 201 })
  } catch (error) {
    console.error('Create sewing rework error:', error)
    return NextResponse.json({ error: 'Ошибка создания переделки' }, { status: 500 })
  }
}, ['supervisor', 'qc'])
