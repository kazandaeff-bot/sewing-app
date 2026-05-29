import { db } from '@/lib/db'
import { validateBody } from '@/lib/api-auth'
import { UpdateSellerPlanSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sellerPlan = await db.sellerPlan.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true } },
        items: {
          include: {
            product: true,
            cities: true,
          },
        },
        boxes: {
          include: {
            items: { include: { product: true } },
          },
        },
      },
    })
    if (!sellerPlan) {
      return NextResponse.json({ error: 'План селлера не найден' }, { status: 404 })
    }
    return NextResponse.json(sellerPlan)
  } catch (error) {
    console.error('Get seller plan error:', error)
    return NextResponse.json({ error: 'Ошибка получения плана селлера' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await validateBody(request, UpdateSellerPlanSchema)
    if ('error' in result) return result.error
    const { status, items, sellerName, customerId } = result.data

    const existing = await db.sellerPlan.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'План селлера не найден' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (sellerName !== undefined) updateData.sellerName = sellerName
    if (customerId !== undefined) updateData.customerId = customerId || null

    // Update items with cities if provided
    if (items && Array.isArray(items)) {
      // Delete existing items and recreate (simplest approach for now)
      await db.sellerPlanCity.deleteMany({
        where: { sellerPlanItem: { sellerPlanId: id } },
      })
      await db.sellerPlanItem.deleteMany({
        where: { sellerPlanId: id },
      })

      updateData.items = {
        create: items.map((item: { productId: string; size: string; color: string; colorHex?: string; quantity: number; cities?: { city: string; quantity: number }[] }) => ({
          productId: item.productId,
          size: item.size,
          color: item.color,
          colorHex: item.colorHex || '#9ca3af',
          quantity: item.quantity,
          cities: {
            create: (item.cities || []).map((city: { city: string; quantity: number }) => ({
              city: city.city,
              quantity: city.quantity,
            })),
          },
        })),
      }
    }

    const updated = await db.sellerPlan.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true } },
        items: {
          include: {
            product: true,
            cities: true,
          },
        },
        boxes: {
          include: {
            items: { include: { product: true } },
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update seller plan error:', error)
    return NextResponse.json({ error: 'Ошибка обновления плана селлера' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.sellerPlanCity.deleteMany({
      where: { sellerPlanItem: { sellerPlanId: id } },
    })
    await db.sellerPlanItem.deleteMany({ where: { sellerPlanId: id } })
    await db.boxItem.deleteMany({
      where: { box: { sellerPlanId: id } },
    })
    await db.box.deleteMany({ where: { sellerPlanId: id } })
    await db.sellerPlan.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete seller plan error:', error)
    return NextResponse.json({ error: 'Ошибка удаления плана селлера' }, { status: 500 })
  }
}
