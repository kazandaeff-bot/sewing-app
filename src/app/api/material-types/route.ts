import { db } from '@/lib/db'
import { withAuth, validateBody } from '@/lib/api-auth'
import { CreateMaterialTypeSchema } from '@/lib/schemas'
import { NextRequest, NextResponse } from 'next/server'

export const GET = withAuth(async (req, ctx, user) => {
  try {
    const types = await db.materialType.findMany({
      orderBy: { name: 'asc' },
      include: { materials: { orderBy: { name: 'asc' }, include: { norms: true, entries: { orderBy: { date: 'desc' }, take: 1 } } } },
    })
    return NextResponse.json(types, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Get material types error:', error)
    return NextResponse.json({ error: 'Ошибка получения типов материалов' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}, ['supervisor'])

export const POST = withAuth(async (req, ctx, user) => {
  try {
    const result = await validateBody(req, CreateMaterialTypeSchema)
    if ('error' in result) return result.error
    const { name, unit } = result.data
    const type = await db.materialType.create({
      data: { name, unit },
      include: { materials: true },
    })
    return NextResponse.json(type, { status: 201, headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Тип материала с таким названием уже существует' }, { status: 409, headers: { 'Cache-Control': 'no-store' } })
    }
    console.error('Create material type error:', error)
    return NextResponse.json({ error: 'Ошибка создания типа материала' }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}, ['supervisor'])
