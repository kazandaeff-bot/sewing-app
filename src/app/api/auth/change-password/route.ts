import { NextRequest, NextResponse } from 'next/server'
import { withAuth, validateBody } from '@/lib/api-auth'
import { z } from 'zod'
import { comparePassword, hashPassword } from '@/lib/auth'
import { db } from '@/lib/db'

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Укажите текущий пароль'),
  newPassword: z.string().min(6, 'Новый пароль должен содержать минимум 6 символов'),
})

export const POST = withAuth(async (req, _ctx, user) => {
  try {
    const result = await validateBody(req, ChangePasswordSchema)
    if ('error' in result) return result.error
    const { currentPassword, newPassword } = result.data

    // Get current password hash
    const employee = await db.employee.findUnique({
      where: { id: user.id },
      select: { password: true },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    // Verify current password
    const isValid = await comparePassword(currentPassword, employee.password)
    if (!isValid) {
      return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 400 })
    }

    // Hash and save new password
    const hashedPassword = await hashPassword(newPassword)
    await db.employee.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ success: true, message: 'Пароль успешно изменён' })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Ошибка смены пароля' }, { status: 500 })
  }
})
