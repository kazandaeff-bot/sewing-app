import { db } from '@/lib/db'
import { validateBody } from '@/lib/api-auth'
import { CreateProductSizeRateSchema, UpdateProductSizeRateSchema, DeleteProductSizeRateSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

const HEADERS = { 'Cache-Control': 'no-store' }

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { error: 'Укажите productId' },
        { status: 400, headers: HEADERS }
      )
    }

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
}

export async function POST(request: NextRequest) {
  try {
    const result = await validateBody(request, CreateProductSizeRateSchema)
    if ('error' in result) return result.error
    const { productId, size, sewerRate, homeRate, qcRate, ironingRate, cuttingRate } = result.data

    const sizeRate = await db.productSizeRate.upsert({
      where: {
        productId_size: { productId, size },
      },
      update: {
        sewerRate: sewerRate !== undefined ? sewerRate : null,
        homeRate: homeRate !== undefined ? homeRate : null,
        qcRate: qcRate !== undefined ? qcRate : null,
        ironingRate: ironingRate !== undefined ? ironingRate : null,
        cuttingRate: cuttingRate !== undefined ? cuttingRate : null,
      },
      create: {
        productId,
        size,
        sewerRate: sewerRate ?? null,
        homeRate: homeRate ?? null,
        qcRate: qcRate ?? null,
        ironingRate: ironingRate ?? null,
        cuttingRate: cuttingRate ?? null,
      },
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
}

export async function PATCH(request: NextRequest) {
  try {
    const result = await validateBody(request, UpdateProductSizeRateSchema)
    if ('error' in result) return result.error
    const { id, sewerRate, homeRate, qcRate, ironingRate, cuttingRate } = result.data

    const data: Record<string, any> = {}
    if (sewerRate !== undefined) data.sewerRate = sewerRate
    if (homeRate !== undefined) data.homeRate = homeRate
    if (qcRate !== undefined) data.qcRate = qcRate
    if (ironingRate !== undefined) data.ironingRate = ironingRate
    if (cuttingRate !== undefined) data.cuttingRate = cuttingRate

    const sizeRate = await db.productSizeRate.update({
      where: { id },
      data,
      include: { product: true },
    })

    return NextResponse.json(sizeRate, { headers: HEADERS })
  } catch (error: any) {
    console.error('Update product size rate error:', error)
    if (error?.code === 'P2025') {
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
}

export async function DELETE(request: NextRequest) {
  try {
    const result = await validateBody(request, DeleteProductSizeRateSchema)
    if ('error' in result) return result.error
    const { id } = result.data

    await db.productSizeRate.delete({ where: { id } })

    return NextResponse.json({ success: true }, { headers: HEADERS })
  } catch (error: any) {
    console.error('Delete product size rate error:', error)
    if (error?.code === 'P2025') {
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
}
