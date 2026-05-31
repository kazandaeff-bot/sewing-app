import { NextResponse } from 'next/server'
import { withAuth, validateBody, validateParams } from '@/lib/api-auth'
import { IdParamSchema } from '@/lib/schemas'
import { z } from 'zod'
import { hashPassword } from '@/lib/auth'
import { db } from '@/lib/db'

const ResetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
})

export const POST = withAuth(async (req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, ResetPasswordSchema)
    if ('error' in result) return result.error
    const { newPassword } = result.data

    const employee = await db.employee.findUnique({ where: { id } })
    if (!employee) {
      return NextResponse.json({ error: 'Сотрудник не найден' }, { status: 404 })
    }

    const hashedPassword = await hashPassword(newPassword)
    await db.employee.update({
      where: { id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ success: true, message: 'Пароль успешно сброшен' })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Ошибка сброса пароля' }, { status: 500 })
  }
}, ['supervisor'])
