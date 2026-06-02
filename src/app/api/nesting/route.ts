import { db } from '@/lib/db'
import { withAuth, validateBody } from '@/lib/api-auth'
import { CreateNestingLayoutSchema } from '@/lib/schemas'
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

// GET /api/nesting — list all nesting layouts with items and pattern
export const GET = withAuth(async () => {
  try {
    const layouts = await db.nestingLayout.findMany({
      orderBy: { createdAt: 'desc' },
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

    const result = layouts.map(parseLayout)

    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Get nesting layouts error:', error)
    return NextResponse.json(
      { error: 'Ошибка получения списка раскладок' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor', 'cutter'])

// POST /api/nesting — create a new nesting layout
export const POST = withAuth(async (req) => {
  try {
    const result = await validateBody(req, CreateNestingLayoutSchema)
    if ('error' in result) return result.error

    const { name, patternId, fabricWidth, items } = result.data

    const layout = await db.nestingLayout.create({
      data: {
        name,
        patternId: patternId || null,
        fabricWidth,
        items: {
          create: items.map((item) => ({
            patternPieceId: item.patternPieceId,
            x: item.x,
            y: item.y,
            rotation: item.rotation,
            flipped: item.flipped,
          })),
        },
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

    const response = parseLayout(layout)

    return NextResponse.json(response, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Лекало не найдено' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    console.error('Create nesting layout error:', error)
    return NextResponse.json(
      { error: 'Ошибка создания раскладки' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor', 'cutter'])
