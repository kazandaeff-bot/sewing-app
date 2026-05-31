/**
 * Unified API error handling.
 * Maps Prisma errors and common error types to consistent JSON responses.
 *
 * Response format: { error: string, code?: string }
 */

import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

/** Prisma error code → user-friendly Russian message */
const PRISMA_ERROR_MAP: Record<string, { message: string; status: number }> = {
  // Unique constraint violation
  P2002: { message: 'Запись с такими данными уже существует', status: 409 },
  // Not found
  P2025: { message: 'Запись не найдена', status: 404 },
  // Foreign key constraint failed
  P2003: { message: 'Невозможно удалить: есть связанные записи', status: 409 },
  // Required relation violation
  P2011: { message: 'Обязательное поле не заполнено', status: 400 },
  // Value too long
  P2000: { message: 'Значение слишком длинное', status: 400 },
}

/**
 * Handle API errors with consistent response format.
 * Automatically maps Prisma errors, Zod errors, and unknown errors.
 *
 * @param error - The error to handle
 * @param context - Optional context for logging (e.g. 'Create plan')
 * @returns NextResponse with consistent error format
 */
export function handleApiError(error: unknown, context?: string): NextResponse {
  // Prisma known errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = PRISMA_ERROR_MAP[error.code]
    if (mapped) {
      if (context) console.error(`[${context}] Prisma ${error.code}:`, error.message)
      return NextResponse.json(
        { error: mapped.message, code: error.code },
        { status: mapped.status },
      )
    }
  }

  // Prisma validation errors (bad query)
  if (error instanceof Prisma.PrismaClientValidationError) {
    if (context) console.error(`[${context}] Prisma validation:`, error.message)
    return NextResponse.json(
      { error: 'Ошибка валидации данных', code: 'VALIDATION_ERROR' },
      { status: 400 },
    )
  }

  // Generic Error with message
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message === 'NOT_FOUND') {
      return NextResponse.json(
        { error: 'Запись не найдена', code: 'NOT_FOUND' },
        { status: 404 },
      )
    }

    if (context) console.error(`[${context}]:`, error.message)
    return NextResponse.json(
      { error: error.message || 'Внутренняя ошибка сервера' },
      { status: 500 },
    )
  }

  // Unknown error type
  if (context) console.error(`[${context}] Unknown error:`, error)
  return NextResponse.json(
    { error: 'Внутренняя ошибка сервера' },
    { status: 500 },
  )
}
