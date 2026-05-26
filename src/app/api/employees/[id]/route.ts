import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, code, role, username, password, customerId } = body
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (code !== undefined) updateData.code = code
    if (role !== undefined) updateData.role = role
    if (username !== undefined) updateData.username = username
    if (password !== undefined && password !== '') updateData.password = password
    if (customerId !== undefined) updateData.customerId = customerId || null
    const employee = await db.employee.update({ where: { id }, data: updateData })
    return NextResponse.json(employee)
  } catch (error) {
    console.error('Update employee error:', error)
    return NextResponse.json({ error: 'Ошибка обновления сотрудника' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.employee.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete employee error:', error)
    return NextResponse.json({ error: 'Ошибка удаления сотрудника' }, { status: 500 })
  }
}