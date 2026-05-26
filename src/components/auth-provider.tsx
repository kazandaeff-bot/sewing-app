'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

interface User {
  id: string
  name: string
  role: string
  code: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

const AUTH_CHECK_TIMEOUT = 8000
const USER_KEY = 'auth_user'

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
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
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

    // First check: try server-side session (cookie)
    fetch('/api/auth/me', { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (!cancelled) {
          if (data.user) {
            setUser(data.user)
            saveUserToStorage(data.user)
          } else {
            // No server session — check localStorage
            const storedUser = loadUserFromStorage()
            if (storedUser) {
              setUser(storedUser)
            } else {
              setUser(null)
            }
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Network error — try localStorage as fallback
          const storedUser = loadUserFromStorage()
          if (storedUser) {
            setUser(storedUser)
          } else {
            setUser(null)
          }
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
      })
      const data = await res.json()
      if (res.ok && data.user) {
        setUser(data.user)
        // Save to localStorage for persistence across page navigations
        saveUserToStorage(data.user)
        return { success: true }
      }
      return { success: false, error: data.error || 'Ошибка входа' }
    } catch {
      return { success: false, error: 'Ошибка подключения' }
    }
  }

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    clearUserStorage()
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}