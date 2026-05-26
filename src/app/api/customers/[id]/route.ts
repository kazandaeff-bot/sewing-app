import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        customerProducts: {
          include: {
            product: {
              select: { id: true, name: true, article: true, sizes: true, colors: true }
            }
          }
        },
        employees: {
          select: { id: true, name: true, code: true, role: true }
        }
      },
    })
    if (!customer) {
      return NextResponse.json({ error: 'Заказчик не найден' }, { status: 404 })
    }
    return NextResponse.json(customer)
  } catch (error) {
    console.error('Get customer error:', error)
    return NextResponse.json({ error: 'Ошибка получения заказчика' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, contactInfo, addProducts, removeProducts, updateProducts } = body

    // Update basic fields
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (contactInfo !== undefined) updateData.contactInfo = contactInfo

    if (Object.keys(updateData).length > 0) {
      await db.customer.update({ where: { id }, data: updateData })
    }

    // Remove products
    if (removeProducts && Array.isArray(removeProducts) && removeProducts.length > 0) {
      await db.customerProduct.deleteMany({
        where: {
          customerId: id,
          productId: { in: removeProducts }
        }
      })
    }

    // Add products
    if (addProducts && Array.isArray(addProducts) && addProducts.length > 0) {
      for (const item of addProducts) {
        await db.customerProduct.upsert({
          where: {
            customerId_productId: { customerId: id, productId: item.productId }
          },
          create: {
            customerId: id,
            productId: item.productId,
            customBoxCapacity: item.customBoxCapacity ?? null,
            customWeight: item.customWeight ?? null,
            customDimensions: item.customDimensions ?? null,
            customWidth: item.customWidth ?? null,
            customHeight: item.customHeight ?? null,
          },
          update: {
            customBoxCapacity: item.customBoxCapacity ?? undefined,
            customWeight: item.customWeight ?? undefined,
            customDimensions: item.customDimensions ?? undefined,
            customWidth: item.customWidth ?? undefined,
            customHeight: item.customHeight ?? undefined,
          }
        })
      }
    }

    // Update existing products
    if (updateProducts && Array.isArray(updateProducts) && updateProducts.length > 0) {
      for (const item of updateProducts) {
        const existing = await db.customerProduct.findUnique({
          where: {
            customerId_productId: { customerId: id, productId: item.productId }
          }
        })
        if (existing) {
          const productUpdate: Record<string, unknown> = {}
          if (item.customBoxCapacity !== undefined) productUpdate.customBoxCapacity = item.customBoxCapacity
          if (item.customWeight !== undefined) productUpdate.customWeight = item.customWeight
          if (item.customDimensions !== undefined) productUpdate.customDimensions = item.customDimensions
          if (item.customWidth !== undefined) productUpdate.customWidth = item.customWidth
          if (item.customHeight !== undefined) productUpdate.customHeight = item.customHeight
          if (Object.keys(productUpdate).length > 0) {
            await db.customerProduct.update({
              where: { id: existing.id },
              data: productUpdate
            })
          }
        }
      }
    }

    // Return updated customer
    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        customerProducts: {
          include: {
            product: { select: { id: true, name: true, article: true } }
          }
        }
      }
    })
    return NextResponse.json(customer)
  } catch (error) {
    console.error('Update customer error:', error)
    return NextResponse.json({ error: 'Ошибка обновления заказчика' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.customer.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete customer error:', error)
    return NextResponse.json({ error: 'Ошибка удаления заказчика' }, { status: 500 })
  }
}
