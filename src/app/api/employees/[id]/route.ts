import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, validateParams, validateBody } from '@/lib/api-auth'
import { IdParamSchema, UpdateEmployeeSchema } from '@/lib/schemas'
import { hashPassword } from '@/lib/auth'

export const PATCH = withAuth(async (req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    const result = await validateBody(req, UpdateEmployeeSchema)
    if ('error' in result) return result.error
    const { name, code, role, username, password, customerId } = result.data

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (code !== undefined) updateData.code = code
    if (role !== undefined) updateData.role = role
    if (username !== undefined) updateData.username = username
    if (password !== undefined && password !== '') updateData.password = await hashPassword(password)
    if (customerId !== undefined) updateData.customerId = customerId || null

    const employee = await db.employee.update({ where: { id }, data: updateData })
    return NextResponse.json(employee)
  } catch (error) {
    console.error('Update employee error:', error)
    return NextResponse.json({ error: 'Ошибка обновления сотрудника' }, { status: 500 })
  }
}, ['supervisor'])

export const DELETE = withAuth(async (_req, ctx, _user) => {
  try {
    const p = await validateParams(ctx, IdParamSchema)
    if ('error' in p) return p.error
    const { id } = p.data

    await db.employee.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete employee error:', error)
    return NextResponse.json({ error: 'Ошибка удаления сотрудника' }, { status: 500 })
  }
}, ['supervisor'])
