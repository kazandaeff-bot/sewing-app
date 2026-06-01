import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { comparePassword, signToken } from '@/lib/auth'
import { validateBody } from '@/lib/api-auth'
import { LoginSchema } from '@/lib/schemas'
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: check by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown'

    const rateCheck = checkRateLimit(ip)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Слишком много попыток входа. Попробуйте снова через ${Math.ceil(rateCheck.retryAfterMs / 60000)} мин.` },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) } },
      )
    }

    const result = await validateBody(request, LoginSchema)
    if ('error' in result) return result.error
    const { username, password } = result.data

    const employee = await db.employee.findUnique({
      where: { username },
    })

    if (!employee) {
      recordFailedAttempt(ip)
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
    }

    const isValid = await comparePassword(password, employee.password)
    if (!isValid) {
      recordFailedAttempt(ip)
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 })
    }

    // Successful login — clear rate limit
    clearRateLimit(ip)

    const token = await signToken({
      id: employee.id,
      name: employee.name,
      role: employee.role,
      code: employee.code,
      customerId: employee.customerId || null,
    })

    // Return token in response body so the client can store it
    // and send via Authorization header
    return NextResponse.json({
      user: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        code: employee.code,
        customerId: employee.customerId || null,
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Ошибка входа' }, { status: 500 })
  }
}
