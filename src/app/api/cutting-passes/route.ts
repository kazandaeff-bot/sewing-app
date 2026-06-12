import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { z } from 'zod'

// ============ ЗАХОДЫ РАСКРОЯ (настилы) ============
// Позволяют учитывать несколько заходов с разным количеством слоёв

const CreatePassSchema = z.object({
  cuttingPlanItemId: z.string().min(1),
  layers: z.coerce.number().int().positive('Кол-во слоёв должно быть > 0'),
  actualQty: z.coerce.number().int().nonnegative().optional(),
  note: z.string().optional(),
})

const UpdatePassSchema = z.object({
  id: z.string().min(1),
  layers: z.coerce.number().int().positive().optional(),
  actualQty: z.coerce.number().int().nonnegative().nullable().optional(),
  note: z.string().nullable().optional(),
})

const DeletePassSchema = z.object({
  id: z.string().min(1),
})

const SaveAllPassesSchema = z.object({
  cuttingPlanItemId: z.string().min(1),
  passes: z.array(z.object({
    id: z.string().optional(), // если есть — обновить, если нет — создать
    passNumber: z.coerce.number().int().positive(),
    layers: z.coerce.number().int().positive(),
    actualQty: z.coerce.number().int().nonnegative().optional(),
    note: z.string().optional(),
  })),
})

// POST — создать заход (или сохранить все заходы разом)
export const POST = withAuth(async (req, _ctx, _user) => {
  try {
    const body = await req.json()

    // Режим: сохранить все заходы разом
    if (body.passes && Array.isArray(body.passes)) {
      const result = SaveAllPassesSchema.safeParse(body)
      if (!result.success) {
        return NextResponse.json({ error: 'Неверные данные', details: result.error.issues }, { status: 400 })
      }
      const { cuttingPlanItemId, passes } = result.data

      // Проверяем что CuttingPlanItem существует
      const item = await db.cuttingPlanItem.findUnique({ where: { id: cuttingPlanItemId } })
      if (!item) {
        return NextResponse.json({ error: 'Позиция раскроя не найдена' }, { status: 404 })
      }

      // Удаляем все существующие заходы и создаём заново (проще чем синхронизировать)
      await db.$transaction(async (tx) => {
        await tx.cuttingPass.deleteMany({ where: { cuttingPlanItemId } })

        for (const pass of passes) {
          await tx.cuttingPass.create({
            data: {
              cuttingPlanItemId,
              passNumber: pass.passNumber,
              layers: pass.layers,
              actualQty: pass.actualQty ?? pass.layers,
              note: pass.note,
            },
          })
        }

        // Обновляем bundleCount и actualQty на CuttingPlanItem
        const totalLayers = passes.reduce((sum, p) => sum + p.layers, 0)
        const totalActual = passes.reduce((sum, p) => sum + (p.actualQty ?? p.layers), 0)

        await tx.cuttingPlanItem.update({
          where: { id: cuttingPlanItemId },
          data: {
            bundleCount: passes.length,
            actualQty: totalActual,
          },
        })
      })

      // Возвращаем обновлённые заходы
      const updatedPasses = await db.cuttingPass.findMany({
        where: { cuttingPlanItemId },
        orderBy: { passNumber: 'asc' },
      })
      return NextResponse.json(updatedPasses)
    }

    // Режим: создать один заход
    const result = CreatePassSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Неверные данные', details: result.error.issues }, { status: 400 })
    }
    const { cuttingPlanItemId, layers, actualQty, note } = result.data

    const item = await db.cuttingPlanItem.findUnique({
      where: { id: cuttingPlanItemId },
      include: { passes: { orderBy: { passNumber: 'asc' } } },
    })
    if (!item) {
      return NextResponse.json({ error: 'Позиция раскроя не найдена' }, { status: 404 })
    }

    const passNumber = item.passes.length + 1

    const newPass = await db.cuttingPass.create({
      data: {
        cuttingPlanItemId,
        passNumber,
        layers,
        actualQty: actualQty ?? layers,
        note,
      },
    })

    // Обновляем bundleCount и actualQty на CuttingPlanItem
    const allPasses = [...item.passes, newPass]
    const totalActual = allPasses.reduce((sum, p) => sum + (p.actualQty ?? p.layers), 0)

    await db.cuttingPlanItem.update({
      where: { id: cuttingPlanItemId },
      data: {
        bundleCount: allPasses.length,
        actualQty: totalActual,
      },
    })

    return NextResponse.json(newPass, { status: 201 })
  } catch (error) {
    console.error('Create cutting pass error:', error)
    return NextResponse.json({ error: 'Ошибка создания захода раскроя' }, { status: 500 })
  }
}, ['supervisor', 'cutter'])

// PATCH — обновить один заход
export const PATCH = withAuth(async (req, _ctx, _user) => {
  try {
    const body = await req.json()
    const result = UpdatePassSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: 'Неверные данные', details: result.error.issues }, { status: 400 })
    }
    const { id, layers, actualQty, note } = result.data

    const existing = await db.cuttingPass.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Заход не найден' }, { status: 404 })
    }

    const updated = await db.cuttingPass.update({
      where: { id },
      data: {
        ...(layers !== undefined && { layers }),
        ...(actualQty !== undefined && { actualQty }),
        ...(note !== undefined && { note }),
      },
    })

    // Пересчитываем actualQty на CuttingPlanItem
    const allPasses = await db.cuttingPass.findMany({
      where: { cuttingPlanItemId: existing.cuttingPlanItemId },
    })
    const totalActual = allPasses.reduce((sum, p) => sum + (p.actualQty ?? p.layers), 0)
    await db.cuttingPlanItem.update({
      where: { id: existing.cuttingPlanItemId },
      data: {
        bundleCount: allPasses.length,
        actualQty: totalActual,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update cutting pass error:', error)
    return NextResponse.json({ error: 'Ошибка обновления захода' }, { status: 500 })
  }
}, ['supervisor', 'cutter'])

// DELETE — удалить заход
export const DELETE = withAuth(async (req, _ctx, _user) => {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Укажите id захода' }, { status: 400 })
    }

    const existing = await db.cuttingPass.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Заход не найден' }, { status: 404 })
    }

    const cuttingPlanItemId = existing.cuttingPlanItemId

    await db.cuttingPass.delete({ where: { id } })

    // Перенумеруем оставшиеся заходы и пересчитаем actualQty
    const remaining = await db.cuttingPass.findMany({
      where: { cuttingPlanItemId },
      orderBy: { passNumber: 'asc' },
    })

    await db.$transaction(async (tx) => {
      for (let i = 0; i < remaining.length; i++) {
        await tx.cuttingPass.update({
          where: { id: remaining[i].id },
          data: { passNumber: i + 1 },
        })
      }
    })

    const totalActual = remaining.reduce((sum, p) => sum + (p.actualQty ?? p.layers), 0)
    await db.cuttingPlanItem.update({
      where: { id: cuttingPlanItemId },
      data: {
        bundleCount: remaining.length || null,
        actualQty: remaining.length > 0 ? totalActual : null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete cutting pass error:', error)
    return NextResponse.json({ error: 'Ошибка удаления захода' }, { status: 500 })
  }
}, ['supervisor', 'cutter'])
