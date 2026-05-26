import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, article, imageUrl, sewerRate, homeRate, qcRate, reworkRate, isKit, kitComboColors, sizes, colors } = body
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (article !== undefined) updateData.article = article
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl
    if (sewerRate !== undefined) updateData.sewerRate = sewerRate
    if (homeRate !== undefined) updateData.homeRate = homeRate
    if (qcRate !== undefined) updateData.qcRate = qcRate
    if (reworkRate !== undefined) updateData.reworkRate = reworkRate
    if (isKit !== undefined) updateData.isKit = isKit
    if (kitComboColors !== undefined) updateData.kitComboColors = kitComboColors ? JSON.stringify(kitComboColors) : null

    // Handle sizes: replace all
    if (sizes !== undefined) {
      await db.productSize.deleteMany({ where: { productId: id } })
      if (sizes.length > 0) {
        updateData.sizes = {
          create: sizes.map((s: string) => ({ size: s }))
        }
      }
    }

    // Handle colors: replace all
    if (colors !== undefined) {
      await db.productColor.deleteMany({ where: { productId: id } })
      if (colors.length > 0) {
        updateData.colors = {
          create: colors.map((c: { color: string; colorHex?: string }) => ({
            color: c.color,
            colorHex: c.colorHex || '#9ca3af',
          }))
        }
      }
    }

    const product = await db.product.update({
      where: { id },
      data: updateData,
      include: {
        reworkReasons: true,
        sizes: { orderBy: { size: 'asc' } },
        colors: { orderBy: { color: 'asc' } },
      },
    })
    return NextResponse.json(product)
  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json({ error: 'Ошибка обновления изделия' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json({ error: 'Ошибка удаления изделия' }, { status: 500 })
  }
}