import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'

// GET /api/patterns — list patterns (optional: ?productId=)
export const GET = withAuth(async (req) => {
  try {
    const url = new URL(req.url)
    const productId = url.searchParams.get('productId')

    const where: Record<string, unknown> = {}
    if (productId) where.productId = productId

    const patterns = await db.pattern.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, article: true } },
      },
      orderBy: [{ product: { name: 'asc' } }, { size: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json(patterns)
  } catch (error) {
    console.error('Get patterns error:', error)
    return NextResponse.json({ error: 'Ошибка получения лекал' }, { status: 500 })
  }
}, ['supervisor'])

// POST /api/patterns — create a pattern
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json()
    const { productId, name, size, imageUrl, svgData, points, widthMm, heightMm, areaMm2, seamAllowance, grainAngle, status } = body

    if (!productId || !name || !size) {
      return NextResponse.json({ error: 'Укажите изделие, название и размер' }, { status: 400 })
    }

    const pattern = await db.pattern.create({
      data: {
        productId,
        name,
        size,
        imageUrl: imageUrl || null,
        svgData: svgData || null,
        points: points || null,
        widthMm: widthMm || null,
        heightMm: heightMm || null,
        areaMm2: areaMm2 || null,
        seamAllowance: seamAllowance ?? 10,
        grainAngle: grainAngle ?? 0,
        status: status || 'draft',
      },
      include: {
        product: { select: { id: true, name: true, article: true } },
      },
    })

    return NextResponse.json(pattern, { status: 201 })
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Лекало с таким названием и размером уже существует для этого изделия' }, { status: 409 })
    }
    console.error('Create pattern error:', error)
    return NextResponse.json({ error: 'Ошибка создания лекала' }, { status: 500 })
  }
}, ['supervisor'])
