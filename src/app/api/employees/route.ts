import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, validateBody } from '@/lib/api-auth'
import { CreateEmployeeSchema, UpdateEmployeeSchema } from '@/lib/schemas'
import { hashPassword } from '@/lib/auth'

export const GET = withAuth(async (req, ctx, user) => {
  try {
    const employees = await db.employee.findMany({
      orderBy: { code: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        role: true,
        username: true,
        customerId: true,
        createdAt: true,
        updatedAt: true,
        // password is excluded for security
      },
    })
    return NextResponse.json(employees)
  } catch (error) {
    console.error('Get employees error:', error)
    return NextResponse.json({ error: 'Ошибка получения списка сотрудников' }, { status: 500 })
  }
}, ['supervisor'])

export const POST = withAuth(async (req, ctx, user) => {
  try {
    const result = await validateBody(req, CreateEmployeeSchema)
    if ('error' in result) return result.error
    const { name, code, role, username, password, customerId } = result.data

    const hashedPassword = await hashPassword(password)

    const employee = await db.employee.create({
      data: {
        name,
        code,
        username,
        password: hashedPassword,
        role,
        ...(customerId ? { customerId } : {}),
      },
      select: {
        id: true,
        name: true,
        code: true,
        role: true,
        username: true,
        customerId: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    console.error('Create employee error:', error)
    return NextResponse.json({ error: 'Ошибка создания сотрудника' }, { status: 500 })
  }
}, ['supervisor'])
