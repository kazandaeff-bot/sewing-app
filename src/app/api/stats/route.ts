import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingQcTasks,
      newTasks,
      totalReworks,
      pendingReworks,
      totalFabricDefects,
      employeeStats,
    ] = await Promise.all([
      db.task.count(),
      db.task.count({ where: { status: 'completed' } }),
      db.task.count({ where: { status: 'in_progress' } }),
      db.task.count({ where: { status: 'pending_qc' } }),
      db.task.count({ where: { status: 'new' } }),
      db.rework.count(),
      db.rework.count({ where: { status: 'pending' } }),
      db.task.aggregate({ _sum: { fabricDefect: true } }),
      db.employee.findMany({
        include: {
          tasks: {
            include: {
              reworks: true,
            },
          },
        },
        orderBy: { code: 'asc' },
      }),
    ])

    const perEmployee = employeeStats.map((emp) => {
      const total = emp.tasks.length
      const completed = emp.tasks.filter((t) => t.status === 'completed').length
      const inProgress = emp.tasks.filter((t) => t.status === 'in_progress').length
      const pendingQc = emp.tasks.filter((t) => t.status === 'pending_qc').length
      const newCount = emp.tasks.filter((t) => t.status === 'new').length
      const totalDefects = emp.tasks.reduce((sum, t) => sum + t.fabricDefect, 0)
      const totalReworksForEmp = emp.tasks.reduce((sum, t) => sum + t.reworks.length, 0)
      const pendingReworksForEmp = emp.tasks.reduce(
        (sum, t) => sum + t.reworks.filter((r) => r.status === 'pending').length,
        0
      )
      return {
        id: emp.id,
        name: emp.name,
        code: emp.code,
        role: emp.role,
        totalTasks: total,
        completed,
        inProgress,
        pendingQc,
        new: newCount,
        totalDefects,
        totalReworks: totalReworksForEmp,
        pendingReworks: pendingReworksForEmp,
      }
    })

    return NextResponse.json({
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingQcTasks,
      newTasks,
      totalReworks,
      pendingReworks,
      totalFabricDefects: totalFabricDefects._sum.fabricDefect || 0,
      perEmployee,
    })
  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json({ error: 'Ошибка получения статистики' }, { status: 500 })
  }
}