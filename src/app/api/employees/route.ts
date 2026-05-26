import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const employees = await db.employee.findMany({
      orderBy: { code: 'asc' },
    })
    return NextResponse.json(employees)
  } catch (error) {
    console.error('Get employees error:', error)
    return NextResponse.json({ error: 'Ошибка получения списка сотрудников' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, code, role, username, password } = body
    if (!name || !code || !username || !password) {
      return NextResponse.json({ error: 'Заполните обязательные поля (ФИО, код, логин, пароль)' }, { status: 400 })
    }
    const employee = await db.employee.create({
      data: { name, code, username, password, role: role || 'sewer' },
    })
    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    console.error('Create employee error:', error)
    return NextResponse.json({ error: 'Ошибка создания сотрудника' }, { status: 500 })
  }
}