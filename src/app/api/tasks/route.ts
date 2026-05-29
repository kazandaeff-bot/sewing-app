import { db } from '@/lib/db'
import { withAuth, validateBody, validateQuery } from '@/lib/api-auth'
import { CreateTaskSchema, TasksQuerySchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withAuth(async (req, ctx, user) => {
  try {
    const q = validateQuery(req, TasksQuerySchema)
    if ('error' in q) return q.error
    const { employeeId, status } = q.data

    const where: Record<string, unknown> = {}
    if (employeeId) where.employeeId = employeeId
    if (status) where.status = status

    const tasks = await db.task.findMany({
      where,
      include: {
        employee: true,
        product: true,
        reworks: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json({ error: 'Ошибка получения заданий' }, { status: 500 })
  }
}, ['supervisor', 'sewer'])

export const POST = withAuth(async (req, ctx, user) => {
  try {
    const result = await validateBody(req, CreateTaskSchema)
    if ('error' in result) return result.error
    const { employeeId, productId, size, color, colorHex, quantity } = result.data

    const task = await db.task.create({
      data: {
        employeeId,
        productId,
        size,
        color,
        colorHex,
        quantity,
      },
      include: {
        employee: true,
        product: true,
        reworks: true,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json({ error: 'Ошибка создания задания' }, { status: 500 })
  }
}, ['supervisor'])
