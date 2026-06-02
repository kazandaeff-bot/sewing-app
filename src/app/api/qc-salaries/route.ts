import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'

// GET /api/qc-salaries — list all QC salary records
export const GET = withAuth(async (req) => {
  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const employeeId = url.searchParams.get('employeeId')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (employeeId) where.employeeId = employeeId

    const salaries = await db.qcSalary.findMany({
      where,
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            customer: { select: { id: true, name: true } },
          },
        },
        employee: { select: { id: true, name: true, code: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, article: true } },
          },
          orderBy: { product: { name: 'asc' } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(salaries)
  } catch (error) {
    console.error('Get QC salaries error:', error)
    return NextResponse.json({ error: 'Ошибка получения зарплат ОТК' }, { status: 500 })
  }
}, ['supervisor'])
