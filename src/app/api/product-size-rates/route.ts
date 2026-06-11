import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAuth, validateQuery, validateBody } from '@/lib/api-auth'
import { CreateProductSizeRateSchema, UpdateProductSizeRateSchema, DeleteProductSizeRateSchema, ProductSizeRatesQuerySchema } from '@/lib/schemas'

const HEADERS = { 'Cache-Control': 'no-store' }

export const GET = withAuth(async (req, ctx, user) => {
  try {
    const q = validateQuery(req, ProductSizeRatesQuerySchema)
    if ('error' in q) return q.error
    const { productId } = q.data

    const sizeRates = await db.productSizeRate.findMany({
      where: { productId },
      include: { product: true },
      orderBy: { size: 'asc' },
    })

    return NextResponse.json(sizeRates, { headers: HEADERS })
  } catch (error) {
    console.error('Get product size rates error:', error)
    return NextResponse.json(
      { error: 'Ошибка получения ставок по размерам' },
      { status: 500, headers: HEADERS }
    )
  }
}, ['supervisor'])

export const POST = withAuth(async (req, ctx, user) => {
  try {
    const result = await validateBody(req, CreateProductSizeRateSchema)
    if ('error' in result) return result.error
    const { productId, size, sewerRate, homeRate, qcRate, ironingRate, cuttingRate, fabricCoeff } = result.data

    const updateData: Record<string, unknown> = {
      sewerRate: sewerRate !== undefined ? sewerRate : null,
      homeRate: homeRate !== undefined ? homeRate : null,
      qcRate: qcRate !== undefined ? qcRate : null,
      ironingRate: ironingRate !== undefined ? ironingRate : null,
      cuttingRate: cuttingRate !== undefined ? cuttingRate : null,
    }
    if (fabricCoeff !== undefined) {
      updateData.fabricCoeff = fabricCoeff
    }

    const createData: Record<string, unknown> = {
      productId,
      size,
      sewerRate: sewerRate ?? null,
      homeRate: homeRate ?? null,
      qcRate: qcRate ?? null,
      ironingRate: ironingRate ?? null,
      cuttingRate: cuttingRate ?? null,
    }
    if (fabricCoeff !== undefined && fabricCoeff !== null) {
      createData.fabricCoeff = fabricCoeff
    }

    const sizeRate = await db.productSizeRate.upsert({
      where: {
        productId_size: { productId, size },
      },
      update: updateData,
      create: createData,
      include: { product: true },
    })

    return NextResponse.json(sizeRate, { status: 200, headers: HEADERS })
  } catch (error) {
    console.error('Upsert product size rate error:', error)
    return NextResponse.json(
      { error: 'Ошибка создания/обновления ставки по размеру' },
      { status: 500, headers: HEADERS }
    )
  }
}, ['supervisor'])

export const PATCH = withAuth(async (req, ctx, user) => {
  try {
    const result = await validateBody(req, UpdateProductSizeRateSchema)
    if ('error' in result) return result.error
    const { id, sewerRate, homeRate, qcRate, ironingRate, cuttingRate, fabricCoeff } = result.data

    const data: Record<string, unknown> = {}
    if (sewerRate !== undefined) data.sewerRate = sewerRate
    if (homeRate !== undefined) data.homeRate = homeRate
    if (qcRate !== undefined) data.qcRate = qcRate
    if (ironingRate !== undefined) data.ironingRate = ironingRate
    if (cuttingRate !== undefined) data.cuttingRate = cuttingRate
    if (fabricCoeff !== undefined) data.fabricCoeff = fabricCoeff

    const sizeRate = await db.productSizeRate.update({
      where: { id },
      data,
      include: { product: true },
    })

    return NextResponse.json(sizeRate, { headers: HEADERS })
  } catch (error: unknown) {
    console.error('Update product size rate error:', error)
    const prismaError = error as { code?: string }
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'Ставка по размеру не найдена' },
        { status: 404, headers: HEADERS }
      )
    }
    return NextResponse.json(
      { error: 'Ошибка обновления ставки по размеру' },
      { status: 500, headers: HEADERS }
    )
  }
}, ['supervisor'])

export const DELETE = withAuth(async (req, ctx, user) => {
  try {
    const result = await validateBody(req, DeleteProductSizeRateSchema)
    if ('error' in result) return result.error
    const { id } = result.data

    await db.productSizeRate.delete({ where: { id } })

    return NextResponse.json({ success: true }, { headers: HEADERS })
  } catch (error: unknown) {
    console.error('Delete product size rate error:', error)
    const prismaError = error as { code?: string }
    if (prismaError.code === 'P2025') {
      return NextResponse.json(
        { error: 'Ставка по размеру не найдена' },
        { status: 404, headers: HEADERS }
      )
    }
    return NextResponse.json(
      { error: 'Ошибка удаления ставки по размеру' },
      { status: 500, headers: HEADERS }
    )
  }
}, ['supervisor'])
