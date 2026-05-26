import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const products = await db.product.findMany({
      orderBy: { article: 'asc' },
      include: {
        reworkReasons: true,
        sizes: { orderBy: { size: 'asc' } },
        colors: { orderBy: { color: 'asc' } },
      },
    })
    return NextResponse.json(products)
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json({ error: 'Ошибка получения списка изделий' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, article, imageUrl, sewerRate, homeRate, qcRate, reworkRate, isKit, kitComboColors, sizes, colors } = body
    if (!name || !article) {
      return NextResponse.json({ error: 'Заполните обязательные поля' }, { status: 400 })
    }

    const product = await db.product.create({
      data: {
        name,
        article,
        imageUrl: imageUrl || null,
        sewerRate: sewerRate ?? 150,
        homeRate: homeRate ?? 0,
        qcRate: qcRate ?? 50,
        reworkRate: reworkRate ?? 80,
        isKit: isKit ?? false,
        kitComboColors: kitComboColors ? JSON.stringify(kitComboColors) : null,
        sizes: sizes && sizes.length > 0 ? {
          create: sizes.map((s: string) => ({ size: s }))
        } : undefined,
        colors: colors && colors.length > 0 ? {
          create: colors.map((c: { color: string; colorHex?: string }) => ({
            color: c.color,
            colorHex: c.colorHex || '#9ca3af',
          }))
        } : undefined,
      },
      include: {
        reworkReasons: true,
        sizes: { orderBy: { size: 'asc' } },
        colors: { orderBy: { color: 'asc' } },
      },
    })
    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Create product error:', error)
    return NextResponse.json({ error: 'Ошибка создания изделия' }, { status: 500 })
  }
}