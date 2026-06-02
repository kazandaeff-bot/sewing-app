import { db } from '@/lib/db'
import { withAuth, validateParams } from '@/lib/api-auth'
import { IdParamSchema } from '@/lib/schemas'
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

// Helper: parse a full nesting layout response
function parseLayout(layout: any) {
  return {
    ...layout,
    items: layout.items?.map((item: any) => ({
      ...item,
      patternPiece: item.patternPiece ? parsePieceFields(item.patternPiece) : item.patternPiece,
    })) ?? [],
  }
}

// --- Bottom-Left-Fill Algorithm ---

interface PlacedItem {
  patternPieceId: string
  x: number
  y: number
  rotation: number
  flipped: boolean
  pieceWidth: number
  pieceHeight: number
}

interface OccupiedRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Check if a candidate rectangle overlaps with any occupied rectangle.
 */
function overlaps(
  cx: number,
  cy: number,
  cw: number,
  ch: number,
  occupied: OccupiedRect[],
): boolean {
  for (const rect of occupied) {
    // Two rectangles overlap if they overlap on both axes
    const overlapX = cx < rect.x + rect.width && cx + cw > rect.x
    const overlapY = cy < rect.y + rect.height && cy + ch > rect.y
    if (overlapX && overlapY) return true
  }
  return false
}

/**
 * Find the lowest Y position where a piece of given dimensions can be placed,
 * and within that Y, find the leftmost X.
 * Returns the placement coordinates or null if it doesn't fit.
 */
function findBottomLeftPosition(
  pieceWidth: number,
  pieceHeight: number,
  fabricWidth: number,
  occupied: OccupiedRect[],
): { x: number; y: number } | null {
  // Check if piece fits within fabric width at all
  if (pieceWidth > fabricWidth) return null

  // Collect all candidate Y values: 0 and the top edges of all occupied rects
  const candidateYs = new Set<number>([0])
  for (const rect of occupied) {
    candidateYs.add(rect.y + rect.height)
    candidateYs.add(rect.y) // also try starting at same Y as existing pieces
  }

  // Sort Ys ascending (lowest first)
  const sortedYs = Array.from(candidateYs).sort((a, b) => a - b)

  for (const candidateY of sortedYs) {
    // Collect all candidate X values for this Y: 0 and the right edges of occupied rects at this level
    const candidateXs = new Set<number>([0])
    for (const rect of occupied) {
      // Include right edge of any rect that vertically overlaps with our piece at this Y
      if (rect.y < candidateY + pieceHeight && rect.y + rect.height > candidateY) {
        candidateXs.add(rect.x + rect.width)
        candidateXs.add(rect.x)
      }
    }

    // Sort Xs ascending (leftmost first)
    const sortedXs = Array.from(candidateXs).sort((a, b) => a - b)

    for (const candidateX of sortedXs) {
      // Check piece fits within fabric width
      if (candidateX + pieceWidth > fabricWidth) continue

      // Check no overlap with occupied rects
      if (!overlaps(candidateX, candidateY, pieceWidth, pieceHeight, occupied)) {
        return { x: candidateX, y: candidateY }
      }
    }
  }

  // Fallback: place at the top of the tallest occupied area
  const maxY = occupied.length > 0 ? Math.max(...occupied.map((r) => r.y + r.height)) : 0
  if (pieceWidth <= fabricWidth) {
    return { x: 0, y: maxY }
  }

  return null
}

// POST /api/nesting/[id]/auto-arrange — automatic nesting with bottom-left-fill algorithm
export const POST = withAuth(async (req, ctx) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    // Fetch the layout with its pattern and pieces
    const layout = await db.nestingLayout.findUnique({
      where: { id },
      include: {
        pattern: {
          include: {
            pieces: true,
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

    if (!layout.pattern) {
      return NextResponse.json(
        { error: 'Раскладка не привязана к лекалу — автоматическая раскладка невозможна' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    if (layout.pattern.pieces.length === 0) {
      return NextResponse.json(
        { error: 'Лекало не содержит деталей для раскладки' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const fabricWidth = layout.fabricWidth
    const pieces = layout.pattern.pieces

    // Build the list of pieces to place, expanding by quantity
    interface PieceToPlace {
      patternPieceId: string
      name: string
      width: number
      height: number
      quantity: number
    }

    const piecesToPlace: PieceToPlace[] = pieces.map((piece) => ({
      patternPieceId: piece.id,
      name: piece.name,
      width: piece.width,
      height: piece.height,
      quantity: piece.quantity,
    }))

    // Sort pieces by height descending (tallest first), then by width descending
    const sortedPieces = [...piecesToPlace].sort((a, b) => {
      if (b.height !== a.height) return b.height - a.height
      return b.width - a.width
    })

    // Expand pieces by quantity and try to place each one
    const placedItems: PlacedItem[] = []
    const occupied: OccupiedRect[] = []
    let totalPieceArea = 0

    for (const piece of sortedPieces) {
      for (let i = 0; i < piece.quantity; i++) {
        // Try different orientations: (0°, normal), (180°, normal), (0°, flipped), (180°, flipped)
        // For 0° and 180° the bounding box is (width, height)
        // For 90° and 270° the bounding box is (height, width) — but we only try 0° and 180° per spec

        type Orientation = { rotation: number; flipped: boolean; w: number; h: number }
        const orientations: Orientation[] = [
          { rotation: 0, flipped: false, w: piece.width, h: piece.height },
          { rotation: 180, flipped: false, w: piece.width, h: piece.height },
          { rotation: 0, flipped: true, w: piece.width, h: piece.height },
          { rotation: 180, flipped: true, w: piece.width, h: piece.height },
        ]

        let bestPlacement: { x: number; y: number; orientation: Orientation } | null = null

        for (const orientation of orientations) {
          const pos = findBottomLeftPosition(
            orientation.w,
            orientation.h,
            fabricWidth,
            occupied,
          )

          if (pos) {
            if (!bestPlacement || pos.y < bestPlacement.y || (pos.y === bestPlacement.y && pos.x < bestPlacement.x)) {
              bestPlacement = { ...pos, orientation }
            }
          }
        }

        if (bestPlacement) {
          const { x, y, orientation } = bestPlacement
          placedItems.push({
            patternPieceId: piece.patternPieceId,
            x,
            y,
            rotation: orientation.rotation,
            flipped: orientation.flipped,
            pieceWidth: orientation.w,
            pieceHeight: orientation.h,
          })
          occupied.push({ x, y, width: orientation.w, height: orientation.h })
          totalPieceArea += orientation.w * orientation.h
        }
        // If no placement found for this piece instance, skip it
        // (piece is wider than fabric in all orientations)
      }
    }

    // Calculate fabric length = max Y + piece height of the bottommost-rightmost piece
    let fabricLength = 0
    for (const item of placedItems) {
      const itemBottom = item.y + item.pieceHeight
      if (itemBottom > fabricLength) {
        fabricLength = itemBottom
      }
    }

    // Calculate utilization = (sum of all piece areas) / (fabricWidth * fabricLength) * 100
    const totalFabricArea = fabricWidth * fabricLength
    const utilization = totalFabricArea > 0 ? (totalPieceArea / totalFabricArea) * 100 : 0

    // Delete existing items and create new ones in a transaction
    await db.$transaction(async (tx) => {
      // Remove old nesting items
      await tx.nestingItem.deleteMany({ where: { nestingLayoutId: id } })

      // Create new nesting items
      for (const item of placedItems) {
        await tx.nestingItem.create({
          data: {
            nestingLayoutId: id,
            patternPieceId: item.patternPieceId,
            x: item.x,
            y: item.y,
            rotation: item.rotation,
            flipped: item.flipped,
          },
        })
      }

      // Update the layout with computed fabric length and utilization
      await tx.nestingLayout.update({
        where: { id },
        data: {
          fabricLength,
          utilization: Math.round(utilization * 100) / 100, // Round to 2 decimal places
          status: 'arranged',
        },
      })
    })

    // Fetch the updated layout with all relations
    const updatedLayout = await db.nestingLayout.findUnique({
      where: { id },
      include: {
        pattern: {
          select: { id: true, name: true, status: true },
        },
        items: {
          orderBy: [{ y: 'asc' }, { x: 'asc' }],
          include: {
            patternPiece: true,
          },
        },
      },
    })

    return NextResponse.json(parseLayout(updatedLayout), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Раскладка не найдена' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    console.error('Auto-arrange nesting error:', error)
    return NextResponse.json(
      { error: 'Ошибка автоматической раскладки' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor', 'cutter'])
