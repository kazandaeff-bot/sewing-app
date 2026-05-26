import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get('session')?.value

    if (!token) {
      return NextResponse.json({ user: null })
    }

    const sessionData = JSON.parse(Buffer.from(token, 'base64').toString())
    return NextResponse.json({ user: sessionData })
  } catch {
    return NextResponse.json({ user: null })
  }
}
