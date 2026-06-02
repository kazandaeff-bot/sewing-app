import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'

// GET /api/patterns/[id]
export const GET = withAuth(async (_req, ctx) => {
  try {
    const { id } = await ctx.params
    const pattern = await db.pattern.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, article: true } },
      },
    })
    if (!pattern) {
      return NextResponse.json({ error: 'Лекало не найдено' }, { status: 404 })
    }
    return NextResponse.json(pattern)
  } catch (error) {
    console.error('Get pattern error:', error)
    return NextResponse.json({ error: 'Ошибка получения лекала' }, { status: 500 })
  }
}, ['supervisor'])

// PATCH /api/patterns/[id]
export const PATCH = withAuth(async (req, ctx) => {
  try {
    const { id } = await ctx.params
    const body = await req.json()

    const existing = await db.pattern.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Лекало не найдено' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    const allowedFields = ['name', 'size', 'imageUrl', 'svgData', 'points', 'widthMm', 'heightMm', 'areaMm2', 'seamAllowance', 'grainAngle', 'status']
    for (const field of allowedFields) {
      if (field in body) updateData[field] = body[field]
    }

    const updated = await db.pattern.update({
      where: { id },
      data: updateData,
      include: {
        product: { select: { id: true, name: true, article: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update pattern error:', error)
    return NextResponse.json({ error: 'Ошибка обновления лекала' }, { status: 500 })
  }
}, ['supervisor'])

// DELETE /api/patterns/[id]
export const DELETE = withAuth(async (_req, ctx) => {
  try {
    const { id } = await ctx.params
    const existing = await db.pattern.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Лекало не найдено' }, { status: 404 })
    }

    await db.pattern.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete pattern error:', error)
    return NextResponse.json({ error: 'Ошибка удаления лекала' }, { status: 500 })
  }
}, ['supervisor'])
