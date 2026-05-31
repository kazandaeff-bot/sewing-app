// ============ Shared API Client ============
// Eliminates boilerplate fetch() calls across tab components

import { getAuthHeaders } from '@/components/auth-provider'

/** Extract error message from API response (unified format: { error, code? }) */
async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null)
  if (data && typeof data.error === 'string') return data.error
  if (data && typeof data.message === 'string') return data.message
  return fallback
}

/** Generic GET request with JSON parsing and auth */
export async function apiGet<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { ...getAuthHeaders() },
    credentials: 'include',
  })
  if (!res.ok) {
    const errorMsg = await extractErrorMessage(res, `GET ${url} failed: ${res.status}`)
    throw new Error(errorMsg)
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
    const errorMsg = await extractErrorMessage(res, `POST ${url} failed: ${res.status}`)
    throw new Error(errorMsg)
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
    const errorMsg = await extractErrorMessage(res, `PATCH ${url} failed: ${res.status}`)
    throw new Error(errorMsg)
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
    const errorMsg = await extractErrorMessage(res, `DELETE ${url} failed: ${res.status}`)
    throw new Error(errorMsg)
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
    const errorMsg = await extractErrorMessage(res, `UPLOAD ${url} failed: ${res.status}`)
    throw new Error(errorMsg)
  }
  return res.json()
}
