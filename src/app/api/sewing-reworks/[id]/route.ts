import { db, EMPLOYEE_PUBLIC_INCLUDE } from '@/lib/db'
import { withAuth, validateBody, validateParams } from '@/lib/api-auth'
import { UpdateSewingReworkSchema, IdParamSchema } from '@/lib/schemas'
import { NextResponse } from 'next/server'

export const PATCH = withAuth(async (req, ctx) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, UpdateSewingReworkSchema)
    if ('error' in result) return result.error
    const { status } = result.data

    const existingRework = await db.sewingRework.findUnique({
      where: { id },
      include: {
        sewingTaskItem: { include: { sewingTask: true } },
        sewingTask: true,
      },
    })
    if (!existingRework) {
      return NextResponse.json({ error: 'Переделка не найдена' }, { status: 404 })
    }

    if (status === 'pending_qc') {
      // Just update the rework status
    }

    if (status === 'completed') {
      // No actualQuantity update
    }

    const rework = await db.sewingRework.update({
      where: { id },
      data: { status },
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

    return NextResponse.json(rework)
  } catch (error) {
    console.error('Update sewing rework error:', error)
    return NextResponse.json({ error: 'Ошибка обновления переделки' }, { status: 500 })
  }
}, ['supervisor', 'qc'])
