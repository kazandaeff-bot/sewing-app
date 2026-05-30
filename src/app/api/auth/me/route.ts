import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie — same cookie name as set in /api/auth/login
    const token = request.cookies.get('token')?.value

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
