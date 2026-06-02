import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'

// GET /api/nesting-layouts — list nesting layouts
export const GET = withAuth(async (req) => {
  try {
    const url = new URL(req.url)
    const cuttingPlanId = url.searchParams.get('cuttingPlanId')

    const where: Record<string, unknown> = {}
    if (cuttingPlanId) where.cuttingPlanId = cuttingPlanId

    const layouts = await db.nestingLayout.findMany({
      where,
      include: {
        cuttingPlan: { select: { id: true, label: true, plan: { select: { id: true, name: true } } } },
        items: {
          include: {
            pattern: {
              include: { product: { select: { id: true, name: true, article: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(layouts)
  } catch (error) {
    console.error('Get nesting layouts error:', error)
    return NextResponse.json({ error: 'Ошибка получения раскладок' }, { status: 500 })
  }
}, ['supervisor'])

// POST /api/nesting-layouts — create a nesting layout
export const POST = withAuth(async (req) => {
  try {
    const body = await req.json()
    const { name, cuttingPlanId, fabricWidthMm, fabricLengthMm, items } = body

    if (!name) {
      return NextResponse.json({ error: 'Укажите название раскладки' }, { status: 400 })
    }

    const layout = await db.nestingLayout.create({
      data: {
        name,
        cuttingPlanId: cuttingPlanId || null,
        fabricWidthMm: fabricWidthMm || 1500,
        fabricLengthMm: fabricLengthMm || null,
        status: 'draft',
        ...(items && items.length > 0 && {
          items: {
            create: items.map((item: { patternId: string; posX?: number; posY?: number; rotation?: number; flipped?: boolean }) => ({
              patternId: item.patternId,
              posX: item.posX || 0,
              posY: item.posY || 0,
              rotation: item.rotation || 0,
              flipped: item.flipped || false,
            })),
          },
        }),
      },
      include: {
        cuttingPlan: { select: { id: true, label: true } },
        items: {
          include: {
            pattern: {
              include: { product: { select: { id: true, name: true, article: true } } },
            },
          },
        },
      },
    })

    return NextResponse.json(layout, { status: 201 })
  } catch (error) {
    console.error('Create nesting layout error:', error)
    return NextResponse.json({ error: 'Ошибка создания раскладки' }, { status: 500 })
  }
}, ['supervisor'])
