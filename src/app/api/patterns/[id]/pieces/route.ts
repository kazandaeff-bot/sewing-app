import { db } from '@/lib/db'
import { withAuth, validateBody, validateParams } from '@/lib/api-auth'
import { IdParamSchema, CreatePatternPieceSchema } from '@/lib/schemas'
import { NextResponse } from 'next/server'

// Helper: parse JSON fields on PatternPiece row read from DB
function parsePiece(piece: any) {
  return {
    ...piece,
    points: typeof piece.points === 'string' ? JSON.parse(piece.points) : piece.points,
    notches: piece.notches
      ? typeof piece.notches === 'string'
        ? JSON.parse(piece.notches)
        : piece.notches
      : null,
    scaleCalibration: piece.scaleCalibration
      ? typeof piece.scaleCalibration === 'string'
        ? JSON.parse(piece.scaleCalibration)
        : piece.scaleCalibration
      : null,
  }
}

export const POST = withAuth(async (req, ctx) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, CreatePatternPieceSchema)
    if ('error' in result) return result.error

    const { name, size, points, width, height, grainAngle, seamAllowance, quantity, notches, scaleCalibration } =
      result.data

    const piece = await db.patternPiece.create({
      data: {
        patternId: id,
        name,
        size: size ?? null,
        points: JSON.stringify(points),
        width,
        height,
        grainAngle,
        seamAllowance,
        quantity,
        notches: notches ? JSON.stringify(notches) : null,
        scaleCalibration: scaleCalibration ? JSON.stringify(scaleCalibration) : null,
      },
    })

    return NextResponse.json(parsePiece(piece), {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error: any) {
    if (error?.code === 'P2003') {
      return NextResponse.json(
        { error: 'Лекало не найдено' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    console.error('Create pattern piece error:', error)
    return NextResponse.json(
      { error: 'Ошибка добавления детали лекала' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor', 'technologist'])
