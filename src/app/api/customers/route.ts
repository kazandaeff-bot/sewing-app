import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const customers = await db.customer.findMany({
      orderBy: { name: 'asc' },
      include: {
        customerProducts: {
          include: {
            product: {
              select: { id: true, name: true, article: true }
            }
          }
        },
        _count: {
          select: { employees: true }
        }
      },
    })
    return NextResponse.json(customers)
  } catch (error) {
    console.error('Get customers error:', error)
    return NextResponse.json({ error: 'Ошибка получения списка заказчиков' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, contactInfo } = body
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Укажите название заказчика' }, { status: 400 })
    }
    const customer = await db.customer.create({
      data: {
        name: name.trim(),
        contactInfo: contactInfo?.trim() || null,
      },
      include: {
        customerProducts: {
          include: {
            product: { select: { id: true, name: true, article: true } }
          }
        }
      }
    })
    return NextResponse.json(customer, { status: 201 })
  } catch (error: unknown) {
    console.error('Create customer error:', error)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Заказчик с таким названием уже существует' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Ошибка создания заказчика' }, { status: 500 })
  }
}
