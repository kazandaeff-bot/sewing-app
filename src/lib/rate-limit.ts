// ============ In-memory rate limiter for login attempts ============
// Tracks failed login attempts per IP address.
// In production with multiple instances, replace with Redis-based solution.

interface RateLimitEntry {
  attempts: number
  firstAttemptAt: number
  lockedUntil: number
}

const store = new Map<string, RateLimitEntry>()

// Configuration
const MAX_ATTEMPTS = 5          // Max failed attempts before lockout
const WINDOW_MS = 60 * 1000     // 1 minute window
const LOCKOUT_MS = 5 * 60 * 1000 // 5 minute lockout

// Cleanup old entries every 10 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 10 * 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store.entries()) {
    if (now > entry.lockedUntil && now - entry.firstAttemptAt > WINDOW_MS * 2) {
      store.delete(key)
    }
  }
}

/**
 * Check if an IP address is rate-limited.
 * Returns { allowed: false, retryAfterMs } if blocked, { allowed: true } if OK.
 */
export function checkRateLimit(ip: string): { allowed: true } | { allowed: false; retryAfterMs: number } {
  cleanup()

  const entry = store.get(ip)

  if (!entry) {
    return { allowed: true }
  }

  const now = Date.now()

  // If currently locked out
  if (entry.lockedUntil > now) {
    return { allowed: false, retryAfterMs: entry.lockedUntil - now }
  }

  // If window expired, reset
  if (now - entry.firstAttemptAt > WINDOW_MS) {
    store.delete(ip)
    return { allowed: true }
  }

  return { allowed: true }
}

/**
 * Record a failed login attempt for an IP address.
 * Call this AFTER a failed login to increment the counter.
 */
export function recordFailedAttempt(ip: string): void {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
    // Start new window
    store.set(ip, {
      attempts: 1,
      firstAttemptAt: now,
      lockedUntil: 0,
    })
    return
  }

  entry.attempts += 1

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS
  }
}

/**
 * Clear rate limit for an IP after successful login.
 */
export function clearRateLimit(ip: string): void {
  store.delete(ip)
}
