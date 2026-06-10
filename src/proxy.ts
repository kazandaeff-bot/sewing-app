import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const response = NextResponse.next()

  // Prevent CDN caching for all routes (HTML pages and API)
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  response.headers.delete('X-Nextjs-Cache')

  return response
}

export const config = {
  matcher: ['/:path*', '/api/:path*'],
}
