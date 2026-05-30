import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    let token: string | undefined

    // 1. Check Authorization header (Bearer token)
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    }

    // 2. Fallback: check cookie
    if (!token) {
      token = request.cookies.get('token')?.value
    }

    if (!token) {
      return NextResponse.json({ user: null })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: {
        id: payload.id,
        name: payload.name,
        role: payload.role,
        code: payload.code,
        customerId: payload.customerId || null,
      },
    })
  } catch {
    return NextResponse.json({ user: null })
  }
}
