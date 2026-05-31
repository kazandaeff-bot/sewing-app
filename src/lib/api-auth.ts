// ============ API Validation & Auth Helpers ============
import { ZodSchema, ZodError } from 'zod'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

/** Validate request body against a Zod schema. Returns parsed data or error response. */
export async function validateBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await req.json()
    const data = schema.parse(body)
    return { data }
  } catch (err) {
    if (err instanceof ZodError) {
      const issues = err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }))
      return {
        error: NextResponse.json(
          { error: 'Ошибка валидации', details: issues },
          { status: 400 },
        ),
      }
    }
    // JSON parse error
    return {
      error: NextResponse.json(
        { error: 'Неверный формат JSON' },
        { status: 400 },
      ),
    }
  }
}

/** Validate URL search params against a Zod schema. Returns parsed data or error response. */
export function validateQuery<T>(
  req: NextRequest,
  schema: ZodSchema<T>,
): { data: T } | { error: NextResponse } {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries())
  const result = schema.safeParse(params)
  if (result.success) {
    return { data: result.data }
  }
  const issues = result.error.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
  }))
  return {
    error: NextResponse.json(
      { error: 'Ошибка валидации параметров', details: issues },
      { status: 400 },
    ),
  }
}

/** Validate URL params (e.g. [id]) against a Zod schema. Returns parsed data or error response. */
export async function validateParams<T>(
  ctx: { params: Promise<Record<string, string>> },
  schema: ZodSchema<T>,
): Promise<{ data: T } | { error: NextResponse }> {
  const rawParams = await ctx.params
  const result = schema.safeParse(rawParams)
  if (result.success) {
    return { data: result.data }
  }
  const issues = result.error.issues.map((i) => ({
    path: i.path.join('.'),
    message: i.message,
  }))
  return {
    error: NextResponse.json(
      { error: 'Ошибка валидации параметров URL', details: issues },
      { status: 400 },
    ),
  }
}

// --- Auth middleware for API routes ---

export interface SessionUser {
  id: string
  role: string
  name: string
  customerId?: string | null
}

/**
 * Extract and verify session from request.
 * Checks Authorization header first (Bearer token), then cookie fallback.
 * Returns user info or null if not authenticated.
 */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  try {
    let token: string | undefined

    // 1. Check Authorization header (Bearer token) — most reliable for sandbox/preview
    const authHeader = req.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7)
    }

    // 2. Fallback: check cookie
    if (!token) {
      token = req.cookies.get('token')?.value
    }

    if (!token) return null

    const payload = await verifyToken(token)
    if (!payload) return null

    return {
      id: payload.id as string,
      role: payload.role as string,
      name: payload.name as string,
      customerId: payload.customerId as string | null,
    }
  } catch {
    return null
  }
}

type RouteContext = { params: Promise<Record<string, string>> }

type AuthedHandler = (
  req: NextRequest,
  ctx: RouteContext,
  user: SessionUser,
) => Promise<NextResponse>

/**
 * Wrap an API route handler with authentication and optional role check.
 *
 * Usage:
 *   export const PATCH = withAuth(async (req, { params }, user) => { ... }, ['supervisor'])
 */
export function withAuth(
  handler: AuthedHandler,
  allowedRoles?: string[],
): (req: NextRequest, ctx: RouteContext) => Promise<NextResponse> {
  return async (req, ctx) => {
    const user = await getSessionUser(req)
    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
    }
    return handler(req, ctx, user)
  }
}
