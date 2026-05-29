import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { comparePassword, signToken } from '@/lib/auth'
import { validateBody } from '@/lib/api-auth'
import { LoginSchema } from '@/lib/schemas'

export async function POST(request: NextRequest) {
  try {
    const result = await validateBody(request, LoginSchema)
    if ('error' in result) return result.error
    const { username, password } = result.data

    const employee = await db.employee.findUnique({
      where: { username },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
    }

    const isValid = await comparePassword(password, employee.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
    }

    const token = signToken({
      id: employee.id,
      name: employee.name,
      role: employee.role,
      code: employee.code,
      customerId: employee.customerId || null,
    })

    const response = NextResponse.json({
      user: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        code: employee.code,
        customerId: employee.customerId || null,
      },
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Ошибка входа' }, { status: 500 })
  }
}
