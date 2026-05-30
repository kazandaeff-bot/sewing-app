// ============ Shared API Client ============
// Eliminates boilerplate fetch() calls across tab components

import { getAuthHeaders } from '@/components/auth-provider'

/** Generic GET request with JSON parsing and auth */
export async function apiGet<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { ...getAuthHeaders() },
    credentials: 'include',
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || `GET ${url} failed: ${res.status}`)
  }
  return res.json()
}

/** Generic POST request with JSON body and auth */
export async function apiPost<T = unknown>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || `POST ${url} failed: ${res.status}`)
  }
  return res.json()
}

/** Generic PATCH request with JSON body and auth */
export async function apiPatch<T = unknown>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
    credentials: 'include',
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || `PATCH ${url} failed: ${res.status}`)
  }
  return res.json()
}

/** Generic DELETE request with auth */
export async function apiDelete<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
    credentials: 'include',
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || `DELETE ${url} failed: ${res.status}`)
  }
  return res.json()
}

/** POST with FormData (for file uploads) and auth */
export async function apiUpload<T = unknown>(url: string, formData: FormData): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
    body: formData,
    credentials: 'include',
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || `UPLOAD ${url} failed: ${res.status}`)
  }
  return res.json()
}
