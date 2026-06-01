import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const SALT_ROUNDS = 10

// JWT secret — must be at least 32 chars for HS256
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret || secret === 'dev-secret-change-me') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is not set. Refusing to start in production without a secure secret.')
    }
    console.warn('⚠️  JWT_SECRET is not set or uses default value. Generate a secure secret and set it in .env')
  }
  return new TextEncoder().encode(secret || 'dev-secret-change-me')
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export interface TokenPayload {
  id: string
  name: string
  role: string
  code?: string
  customerId?: string | null
}

/**
 * Sign a JWT token with HMAC-SHA256.
 * Properly signed — signature is verified on decode.
 */
export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

/**
 * Verify and decode a JWT token.
 * Returns null if the signature is invalid, token is expired, or format is wrong.
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ['HS256'],
    })
    return {
      id: payload.id as string,
      name: payload.name as string,
      role: payload.role as string,
      code: payload.code as string | undefined,
      customerId: payload.customerId as string | null,
    }
  } catch {
    return null
  }
}
