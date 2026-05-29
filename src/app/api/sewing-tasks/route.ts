import { db } from '@/lib/db'
import { validateBody } from '@/lib/api-auth'
import { CreateSewingTaskSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (employeeId) where.employeeId = employeeId
    if (status) where.status = status

    const sewingTasks = await db.sewingTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        cuttingPlan: { include: { plan: true } },
        employee: true,
        items: {
          include: { product: true, reworks: true },
          orderBy: { id: 'asc' },
        },
        reworks: {
          include: {
            sewingTaskItem: { include: { product: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    return NextResponse.json(sewingTasks)
  } catch (error) {
    console.error('Get sewing tasks error:', error)
    return NextResponse.json({ error: 'Ошибка получения заданий для швей' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await validateBody(request, CreateSewingTaskSchema)
    if ('error' in result) return result.error
    const { cuttingPlanId, employeeId, items } = result.data

    // Verify cutting plan exists and is in "cut" status
    const cuttingPlan = await db.cuttingPlan.findUnique({ where: { id: cuttingPlanId } })
    if (!cuttingPlan) {
      return NextResponse.json({ error: 'План раскроя не найден' }, { status: 404 })
    }
    if (cuttingPlan.status !== 'cut') {
      return NextResponse.json({ error: 'План раскроя должен быть в статусе "раскроено"' }, { status: 400 })
    }

    // Validate: check that assigned quantities don't exceed cutting plan
    const cuttingPlanItems = await db.cuttingPlanItem.findMany({ where: { cuttingPlanId } })
    const existingTasks = await db.sewingTask.findMany({
      where: { cuttingPlanId },
      include: { items: true },
    })

    // Build a map of already assigned quantities per (productId, size, color)
    const assignedMap = new Map<string, number>()
    for (const task of existingTasks) {
      for (const item of task.items) {
        const key = `${item.productId}|${item.size}|${item.color}`
        assignedMap.set(key, (assignedMap.get(key) || 0) + item.quantity)
      }
    }

    // Add new items and check
    const newMap = new Map(assignedMap)
    for (const item of items) {
      const key = `${item.productId}|${item.size}|${item.color}`
      newMap.set(key, (newMap.get(key) || 0) + item.quantity)
    }

    for (const cpItem of cuttingPlanItems) {
      const key = `${cpItem.productId}|${cpItem.size}|${cpItem.color}`
      const assigned = newMap.get(key) || 0
      if (assigned > cpItem.plannedQty) {
        return NextResponse.json({
          error: `Превышено количество: ${cpItem.color} размер ${cpItem.size} — назначено ${assigned}, доступно ${cpItem.plannedQty}`,
        }, { status: 400 })
      }
    }

    const sewingTask = await db.sewingTask.create({
      data: {
        cuttingPlanId,
        employeeId,
        status: 'issued',
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            size: item.size,
            color: item.color,
            colorHex: item.colorHex,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        cuttingPlan: { include: { plan: true } },
        employee: true,
        items: { include: { product: true } },
      },
    })

    return NextResponse.json(sewingTask, { status: 201 })
  } catch (error) {
    console.error('Create sewing task error:', error)
    return NextResponse.json({ error: 'Ошибка создания задания' }, { status: 500 })
  }
}