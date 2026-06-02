import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'

// GET /api/nesting-layouts/[id]
export const GET = withAuth(async (_req, ctx) => {
  try {
    const { id } = await ctx.params
    const layout = await db.nestingLayout.findUnique({
      where: { id },
      include: {
        cuttingPlan: { select: { id: true, label: true, plan: { select: { id: true, name: true } } } },
        items: {
          include: {
            pattern: {
              include: { product: { select: { id: true, name: true, article: true } } },
            },
          },
        },
      },
    })
    if (!layout) {
      return NextResponse.json({ error: 'Раскладка не найдена' }, { status: 404 })
    }
    return NextResponse.json(layout)
  } catch (error) {
    console.error('Get nesting layout error:', error)
    return NextResponse.json({ error: 'Ошибка получения раскладки' }, { status: 500 })
  }
}, ['supervisor'])

// PATCH /api/nesting-layouts/[id]
export const PATCH = withAuth(async (req, ctx) => {
  try {
    const { id } = await ctx.params
    const body = await req.json()

    const existing = await db.nestingLayout.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Раскладка не найдена' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    const allowedFields = ['name', 'fabricWidthMm', 'fabricLengthMm', 'totalAreaMm2', 'utilization', 'svgPreview', 'status']
    for (const field of allowedFields) {
      if (field in body) updateData[field] = body[field]
    }

    // If items are provided, replace them
    if (body.items && Array.isArray(body.items)) {
      await db.nestingItem.deleteMany({ where: { nestingLayoutId: id } })
      updateData.items = {
        create: body.items.map((item: { patternId: string; posX?: number; posY?: number; rotation?: number; flipped?: boolean }) => ({
          patternId: item.patternId,
          posX: item.posX || 0,
          posY: item.posY || 0,
          rotation: item.rotation || 0,
          flipped: item.flipped || false,
        })),
      }
    }

    const updated = await db.nestingLayout.update({
      where: { id },
      data: updateData,
      include: {
        cuttingPlan: { select: { id: true, label: true } },
        items: {
          include: {
            pattern: {
              include: { product: { select: { id: true, name: true, article: true } } },
            },
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update nesting layout error:', error)
    return NextResponse.json({ error: 'Ошибка обновления раскладки' }, { status: 500 })
  }
}, ['supervisor'])

// DELETE /api/nesting-layouts/[id]
export const DELETE = withAuth(async (_req, ctx) => {
  try {
    const { id } = await ctx.params
    const existing = await db.nestingLayout.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Раскладка не найдена' }, { status: 404 })
    }

    await db.nestingLayout.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete nesting layout error:', error)
    return NextResponse.json({ error: 'Ошибка удаления раскладки' }, { status: 500 })
  }
}, ['supervisor'])
