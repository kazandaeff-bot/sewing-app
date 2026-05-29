import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, validateBody } from '@/lib/api-auth'
import { CreateProductSchema } from '@/lib/schemas'

export const GET = withAuth(async (req, ctx, user) => {
  try {
    const products = await db.product.findMany({
      orderBy: { article: 'asc' },
      include: {
        reworkReasons: true,
        sizes: { orderBy: { order: 'asc' } },
        colors: { orderBy: { color: 'asc' } },
        materialNorms: { include: { material: true } },
        customerProducts: { include: { customer: true } },
      },
    })
    return NextResponse.json(products)
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json({ error: 'Ошибка получения списка изделий' }, { status: 500 })
  }
}, ['supervisor'])

export const POST = withAuth(async (req, ctx, user) => {
  try {
    const result = await validateBody(req, CreateProductSchema)
    if ('error' in result) return result.error
    const { name, article, imageUrl, sewerRate, homeRate, qcRate, ironingRate, cuttingRate, reworkRate, isKit, kitComboColors, sizes, colors } = result.data

    const product = await db.product.create({
      data: {
        name,
        article,
        imageUrl: imageUrl || null,
        sewerRate,
        homeRate,
        qcRate,
        ironingRate,
        cuttingRate,
        reworkRate,
        isKit,
        kitComboColors: kitComboColors ? JSON.stringify(kitComboColors) : null,
        sizes: sizes && sizes.length > 0 ? {
          create: sizes.map((s: string, i: number) => ({ size: s, order: i }))
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
        sizes: { orderBy: { order: 'asc' } },
        colors: { orderBy: { color: 'asc' } },
      },
    })
    return NextResponse.json(product, { status: 201 })
  } catch (error: any) {
    console.error('Create product error:', error)
    // Check for unique constraint violation (duplicate article)
    if (error?.code === 'P2002' && error?.meta?.target?.includes('article')) {
      return NextResponse.json({ error: 'Изделие с таким артикулом уже существует' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Ошибка создания изделия' }, { status: 500 })
  }
}, ['supervisor'])
