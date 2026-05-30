'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface User {
  id: string
  name: string
  role: string
  code: string
  customerId: string | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  token: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

const AUTH_CHECK_TIMEOUT = 8000
const USER_KEY = 'auth_user'
const TOKEN_KEY = 'auth_token'

function saveUserToStorage(user: User) {
  if (typeof window === 'undefined') return
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function loadUserFromStorage(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const data = localStorage.getItem(USER_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

function clearUserStorage() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

function saveTokenToStorage(token: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

function loadTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * Get authorization headers for API requests.
 * Uses token from localStorage (set during login).
 */
export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

/**
 * Fetch wrapper that automatically includes auth headers.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    ...options.headers,
    ...getAuthHeaders(),
  }
  return fetch(url, { ...options, headers, credentials: 'include' as RequestCredentials })
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        controller.abort()
        setLoading(false)
      }
    }, AUTH_CHECK_TIMEOUT)

    // Try to restore session from localStorage token
    const storedToken = loadTokenFromStorage()
    const storedUser = loadUserFromStorage()

    if (!storedToken || !storedUser) {
      // No stored token — not logged in, skip server check
      clearTimeout(timeoutId)
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => { if (!cancelled) setLoading(false) })
      return () => {
        cancelled = true
        clearTimeout(timeoutId)
        controller.abort()
      }
    }

    // Verify token with server
    fetch('/api/auth/me', {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${storedToken}` },
      credentials: 'include',
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (!cancelled) {
          if (data.user) {
            setUser(data.user)
            setToken(storedToken)
            saveUserToStorage(data.user)
          } else {
            // Token invalid — clear everything
            setUser(null)
            setToken(null)
            clearUserStorage()
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Server unreachable — still use localStorage for offline access
          setUser(storedUser)
          setToken(storedToken)
        }
      })
      .finally(() => {
        if (!cancelled) {
          clearTimeout(timeoutId)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok && data.user) {
        setUser(data.user)
        setToken(data.token)
        saveUserToStorage(data.user)
        if (data.token) {
          saveTokenToStorage(data.token)
        }
        return { success: true }
      }
      return { success: false, error: data.error || 'Ошибка входа' }
    } catch {
      return { success: false, error: 'Ошибка подключения' }
    }
  }

  const logout = async () => {
    const headers = getAuthHeaders()
    await fetch('/api/auth/logout', { method: 'POST', headers, credentials: 'include' })
    setUser(null)
    setToken(null)
    clearUserStorage()
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
