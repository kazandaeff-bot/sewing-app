import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const cuttingPlans = await db.cuttingPlan.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true,
        items: {
          include: { product: true },
          orderBy: { id: 'asc' },
        },
        sewingTasks: {
          include: { employee: true },
        },
        leftovers: {
          include: { product: true },
        },
      },
    })
    return NextResponse.json(cuttingPlans)
  } catch (error) {
    console.error('Get cutting plans error:', error)
    return NextResponse.json({ error: 'Ошибка получения планов раскроя' }, { status: 500 })
  }
}
