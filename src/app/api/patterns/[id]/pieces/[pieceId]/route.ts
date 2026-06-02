import { db } from '@/lib/db'
import { withAuth, validateBody, validateParams } from '@/lib/api-auth'
import { PatternPieceIdParamSchema, UpdatePatternPieceSchema } from '@/lib/schemas'
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

export const PATCH = withAuth(async (req, ctx) => {
  try {
    const p = await validateParams(ctx, PatternPieceIdParamSchema)
    if ('error' in p) return p.error
    const { id, pieceId } = p.data

    const result = await validateBody(req, UpdatePatternPieceSchema)
    if ('error' in result) return result.error

    const data = result.data

    // Build update data — stringify JSON fields if present
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.size !== undefined) updateData.size = data.size ?? null
    if (data.points !== undefined) updateData.points = JSON.stringify(data.points)
    if (data.width !== undefined) updateData.width = data.width
    if (data.height !== undefined) updateData.height = data.height
    if (data.grainAngle !== undefined) updateData.grainAngle = data.grainAngle
    if (data.seamAllowance !== undefined) updateData.seamAllowance = data.seamAllowance
    if (data.quantity !== undefined) updateData.quantity = data.quantity
    if (data.notches !== undefined) {
      updateData.notches = data.notches ? JSON.stringify(data.notches) : null
    }
    if (data.scaleCalibration !== undefined) {
      updateData.scaleCalibration = data.scaleCalibration ? JSON.stringify(data.scaleCalibration) : null
    }

    const piece = await db.patternPiece.update({
      where: { id: pieceId, patternId: id },
      data: updateData,
    })

    return NextResponse.json(parsePiece(piece), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Деталь лекала не найдена' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    console.error('Update pattern piece error:', error)
    return NextResponse.json(
      { error: 'Ошибка обновления детали лекала' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor', 'technologist'])

export const DELETE = withAuth(async (_req, ctx) => {
  try {
    const p = await validateParams(ctx, PatternPieceIdParamSchema)
    if ('error' in p) return p.error
    const { id, pieceId } = p.data

    await db.patternPiece.delete({
      where: { id: pieceId, patternId: id },
    })

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Деталь лекала не найдена' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    console.error('Delete pattern piece error:', error)
    return NextResponse.json(
      { error: 'Ошибка удаления детали лекала' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}, ['supervisor', 'technologist'])
