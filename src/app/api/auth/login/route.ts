import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ error: 'Введите логин и пароль' }, { status: 400 })
    }

    const employee = await db.employee.findUnique({
      where: { username },
    })

    if (!employee || employee.password !== password) {
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
    }

    // Create a simple session token (base64 encoded JSON)
    const sessionData = JSON.stringify({
      id: employee.id,
      name: employee.name,
      role: employee.role,
      code: employee.code,
    })
    const token = Buffer.from(sessionData).toString('base64')

    const response = NextResponse.json({
      user: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        code: employee.code,
      },
    })

    // Set cookie with session token
    response.cookies.set('session', token, {
      httpOnly: false,
      secure: false,
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