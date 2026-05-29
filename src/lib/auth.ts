import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function signToken(payload: Record<string, unknown>): string {
  // Simple base64 token for dev — replace with proper JWT in production
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url')
  const sig = Buffer.from(`${header}.${body}.${JWT_SECRET}`).toString('base64url')
  return `${header}.${body}.${sig}`
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [, body] = parts
    return JSON.parse(Buffer.from(body, 'base64url').toString())
  } catch {
    return null
  }
}
