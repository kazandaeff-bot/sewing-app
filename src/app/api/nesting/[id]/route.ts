import { db } from '@/lib/db'
import { withAuth, validateBody, validateParams } from '@/lib/api-auth'
import { UpdateNestingLayoutSchema, IdParamSchema } from '@/lib/schemas'
import { NextResponse } from 'next/server'

// Helper: parse JSON fields on nested PatternPiece rows read from DB
function parsePieceFields(piece: any) {
  return {
    ...piece,
    points: typeof piece.points === 'string' ? JSON.parse(piece.points) : piece.points,
    notches: piece.notches
      ? typeof piece.notches === 'string'
        ? JSON.parse(piece.notches)
        : piece.notches
      : null,
  }
}

// Helper: parse a full nesting layout response (items → patternPiece JSON fields)
function parseLayout(layout: any) {
  return {
    ...layout,
    items: layout.items?.map((item: any) => ({
      ...item,
      patternPiece: item.patternPiece ? parsePieceFields(item.patternPiece) : item.patternPiece,
    })) ?? [],
  }
}

// GET /api/nesting/[id] — single nesting layout with items and pattern pieces
export const GET = withAuth(async (req, ctx) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const layout = await db.nestingLayout.findUnique({
      where: { id },
      include: {
        pattern: {
          select: { id: true, name: true, status: true },
        },
        items: {
          orderBy: { y: 'asc' },
          include: {
            patternPiece: true,
          },
        },
      },
    })

    if (!layout) {
      return NextResponse.json(
        { error: 'Раскладка не найдена' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return NextResponse.json(parseLayout(layout), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Get nesting layout error:', error)
    return NextResponse.json(
      { error: 'Ошибка получения раскладки' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor', 'cutter'])

// PATCH /api/nesting/[id] — update layout (including replacing items)
export const PATCH = withAuth(async (req, ctx) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, UpdateNestingLayoutSchema)
    if ('error' in result) return result.error

    const data = result.data

    // If items are provided, replace all existing items
    if (data.items !== undefined) {
      // Delete existing items first
      await db.nestingItem.deleteMany({ where: { nestingLayoutId: id } })
    }

    const layout = await db.nestingLayout.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.fabricWidth !== undefined && { fabricWidth: data.fabricWidth }),
        ...(data.fabricLength !== undefined && { fabricLength: data.fabricLength }),
        ...(data.utilization !== undefined && { utilization: data.utilization }),
        ...(data.status !== undefined && { status: data.status }),
        // Create new items if provided
        ...(data.items !== undefined && {
          items: {
            create: data.items.map((item) => ({
              patternPieceId: item.patternPieceId,
              x: item.x,
              y: item.y,
              rotation: item.rotation,
              flipped: item.flipped,
            })),
          },
        }),
      },
      include: {
        pattern: {
          select: { id: true, name: true, status: true },
        },
        items: {
          orderBy: { y: 'asc' },
          include: {
            patternPiece: true,
          },
        },
      },
    })

    return NextResponse.json(parseLayout(layout), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Раскладка не найдена' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Деталь лекала не найдена' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    console.error('Update nesting layout error:', error)
    return NextResponse.json(
      { error: 'Ошибка обновления раскладки' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor', 'cutter'])

// DELETE /api/nesting/[id] — delete a nesting layout (cascades items)
export const DELETE = withAuth(async (req, ctx) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    await db.nestingLayout.delete({ where: { id } })

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Раскладка не найдена' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    console.error('Delete nesting layout error:', error)
    return NextResponse.json(
      { error: 'Ошибка удаления раскладки' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor', 'cutter'])
