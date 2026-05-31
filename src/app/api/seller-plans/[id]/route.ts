import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAuth, validateBody, validateParams } from '@/lib/api-auth'
import { UpdateSellerPlanSchema, IdParamSchema } from '@/lib/schemas'

export const GET = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

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
}, ['supervisor', 'seller'])

export const PATCH = withAuth(async (req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, UpdateSellerPlanSchema)
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
}, ['supervisor', 'seller'])

export const DELETE = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    // Delete all related records in a single transaction
    await db.$transaction(async (tx) => {
      await tx.sellerPlanCity.deleteMany({
        where: { sellerPlanItem: { sellerPlanId: id } },
      })
      await tx.sellerPlanItem.deleteMany({ where: { sellerPlanId: id } })
      await tx.boxItem.deleteMany({
        where: { box: { sellerPlanId: id } },
      })
      await tx.box.deleteMany({ where: { sellerPlanId: id } })
      await tx.sellerPlan.delete({ where: { id } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete seller plan error:', error)
    return NextResponse.json({ error: 'Ошибка удаления плана селлера' }, { status: 500 })
  }
}, ['supervisor'])
