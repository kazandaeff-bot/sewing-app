import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cuttingPlan = await db.cuttingPlan.findUnique({
      where: { id },
      include: {
        plan: true,
        items: { include: { product: true } },
        sewingTasks: {
          include: {
            employee: true,
            items: { include: { product: true } },
          },
        },
      },
    })
    if (!cuttingPlan) {
      return NextResponse.json({ error: 'План раскроя не найден' }, { status: 404 })
    }
    return NextResponse.json(cuttingPlan)
  } catch (error) {
    console.error('Get cutting plan error:', error)
    return NextResponse.json({ error: 'Ошибка получения плана раскроя' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, items } = body

    const existing = await db.cuttingPlan.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'План раскроя не найден' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status

    // Update actualQty on items
    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.id && item.actualQty !== undefined) {
          await db.cuttingPlanItem.update({
            where: { id: item.id },
            data: { actualQty: item.actualQty },
          })
        }
      }
    }

    const updated = await db.cuttingPlan.update({
      where: { id },
      data: updateData,
      include: {
        plan: true,
        items: { include: { product: true } },
        sewingTasks: {
          include: { employee: true },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update cutting plan error:', error)
    return NextResponse.json({ error: 'Ошибка обновления плана раскроя' }, { status: 500 })
  }
}