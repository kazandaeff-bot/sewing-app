import { db } from '@/lib/db'
import { validateBody } from '@/lib/api-auth'
import { CreateCitySchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const cities = await db.city.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(cities)
  } catch (error) {
    console.error('Get cities error:', error)
    return NextResponse.json({ error: 'Ошибка получения списка городов' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const result = await validateBody(request, CreateCitySchema)
    if ('error' in result) return result.error
    const { name } = result.data
    const city = await db.city.create({ data: { name } })
    return NextResponse.json(city, { status: 201 })
  } catch (error) {
    console.error('Create city error:', error)
    return NextResponse.json({ error: 'Ошибка создания города' }, { status: 500 })
  }
}