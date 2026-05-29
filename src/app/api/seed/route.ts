import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const force = new URL(request.url).searchParams.get('force')
    const existingEmployees = await db.employee.count()
    if (existingEmployees > 0 && force !== 'true') {
      return NextResponse.json({ message: 'Данные уже инициализированы (используйте ?force=true для пересоздания)', skipped: true })
    }

    if (existingEmployees > 0 && force === 'true') {
      await db.reworkReason.deleteMany()
      await db.task.deleteMany()
      await db.employee.deleteMany()
      await db.product.deleteMany()
    }

    // Create employees
    const employees = await Promise.all([
      db.employee.create({ data: { name: 'Иванова Мария', code: 'Ш-001', username: 'sewer1', password: '123456', role: 'sewer' } }),
      db.employee.create({ data: { name: 'Петрова Анна', code: 'Ш-002', username: 'sewer2', password: '123456', role: 'sewer' } }),
      db.employee.create({ data: { name: 'Сидорова Елена', code: 'Ш-003', username: 'sewer3', password: '123456', role: 'sewer' } }),
      db.employee.create({ data: { name: 'Козлова Ольга', code: 'Ш-004', username: 'sewer4', password: '123456', role: 'sewer' } }),
      db.employee.create({ data: { name: 'Новикова Татьяна', code: 'Ш-005', username: 'sewer5', password: '123456', role: 'sewer' } }),
      db.employee.create({ data: { name: 'Смирнова Ирина', code: 'ОТК-001', username: 'qc1', password: '123456', role: 'qc' } }),
      db.employee.create({ data: { name: 'Кузнецова Наталья', code: 'ОТК-002', username: 'qc2', password: '123456', role: 'qc' } }),
      db.employee.create({ data: { name: 'Директор Ольга', code: 'РУК-001', username: 'admin', password: 'admin', role: 'supervisor' } }),
    ])

    // Create products with rework reasons
    const products = await Promise.all([
      db.product.create({ data: { name: 'Футболка мужская', article: 'ФМ-01', sewerRate: 120, qcRate: 40, reworkRate: 60 } }),
      db.product.create({ data: { name: 'Футболка женская', article: 'ФЖ-01', sewerRate: 130, qcRate: 40, reworkRate: 65 } }),
      db.product.create({ data: { name: 'Брюки мужские', article: 'БМ-01', sewerRate: 200, qcRate: 60, reworkRate: 100 } }),
      db.product.create({ data: { name: 'Брюки женские', article: 'БЖ-01', sewerRate: 200, qcRate: 60, reworkRate: 100 } }),
      db.product.create({ data: { name: 'Рубашка мужская', article: 'РМ-01', sewerRate: 180, qcRate: 55, reworkRate: 90 } }),
      db.product.create({ data: { name: 'Платье женское', article: 'ПЖ-01', sewerRate: 350, qcRate: 70, reworkRate: 150 } }),
    ])

    // Create rework reasons for products
    const reasonsData = [
      { productId: products[0].id, text: 'Кривой шов на рукаве' },
      { productId: products[0].id, text: 'Неровная строчка' },
      { productId: products[1].id, text: 'Затяжка на ткани' },
      { productId: products[1].id, text: 'Неровный вырез горловины' },
      { productId: products[2].id, text: 'Неровный шаговый шов' },
      { productId: products[2].id, text: 'Расхождение пояса' },
      { productId: products[3].id, text: 'Затяжка на боковом шве' },
      { productId: products[4].id, text: 'Кривой шов на воротнике' },
      { productId: products[4].id, text: 'Неровная планка' },
      { productId: products[5].id, text: 'Неровный шов на подкладке' },
      { productId: products[5].id, text: 'Молния вшита неровно' },
    ]
    for (const rd of reasonsData) {
      await db.reworkReason.create({ data: rd })
    }

    // Create sample tasks
    const tasksData = [
      { employeeId: employees[0].id, productId: products[0].id, size: '48', color: 'белый', colorHex: '#ffffff', quantity: 50, status: 'completed', actualQuantity: 48, fabricDefect: 2, defectNote: 'Мелкие затяжки на ткани' },
      { employeeId: employees[0].id, productId: products[2].id, size: '50', color: 'чёрный', colorHex: '#1a1a1a', quantity: 30, status: 'in_progress', actualQuantity: null, fabricDefect: 0 },
      { employeeId: employees[0].id, productId: products[4].id, size: '46', color: 'синий', colorHex: '#2563eb', quantity: 25, status: 'pending_qc', actualQuantity: 25, fabricDefect: 0 },
      { employeeId: employees[1].id, productId: products[1].id, size: '44', color: 'красный', colorHex: '#ef4444', quantity: 40, status: 'completed', actualQuantity: 40, fabricDefect: 0 },
      { employeeId: employees[1].id, productId: products[3].id, size: '46', color: 'синий', colorHex: '#2563eb', quantity: 35, status: 'pending_qc', actualQuantity: 34, fabricDefect: 1, defectNote: 'Затяжка на боковом шве' },
      { employeeId: employees[2].id, productId: products[4].id, size: '52', color: 'белый', colorHex: '#ffffff', quantity: 25, status: 'new', actualQuantity: null, fabricDefect: 0 },
      { employeeId: employees[2].id, productId: products[0].id, size: '54', color: 'зелёный', colorHex: '#22c55e', quantity: 20, status: 'new', actualQuantity: null, fabricDefect: 0 },
      { employeeId: employees[3].id, productId: products[5].id, size: '42', color: 'красный', colorHex: '#ef4444', quantity: 45, status: 'pending_qc', actualQuantity: 43, fabricDefect: 2, defectNote: 'Неровный шов на подкладке' },
      { employeeId: employees[3].id, productId: products[1].id, size: '46', color: 'серый', colorHex: '#9ca3af', quantity: 30, status: 'new', actualQuantity: null, fabricDefect: 0 },
      { employeeId: employees[4].id, productId: products[2].id, size: '48', color: 'синий', colorHex: '#2563eb', quantity: 35, status: 'in_progress', actualQuantity: null, fabricDefect: 0 },
      { employeeId: employees[4].id, productId: products[4].id, size: '50', color: 'чёрный', colorHex: '#1a1a1a', quantity: 28, status: 'completed', actualQuantity: 28, fabricDefect: 0 },
    ]

    const tasks = []
    for (const td of tasksData) {
      const task = await db.task.create({
        data: {
          ...td,
          completedAt: td.status === 'completed' ? new Date() : null,
        },
      })
      tasks.push(task)
    }

    return NextResponse.json({
      message: 'Данные успешно инициализированы',
      employees: employees.length,
      products: products.length,
      tasks: tasks.length,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Ошибка инициализации данных' }, { status: 500 })
  }
}