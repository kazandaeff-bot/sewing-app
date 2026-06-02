import { z } from 'zod'

// ============ Схемы валидации для API ============

// ---- Сотрудники ----
export const createEmployeeSchema = z.object({
  name: z.string().min(1, 'ФИО обязательно'),
  code: z.string().min(1, 'Код обязателен'),
  username: z.string().min(2, 'Логин минимум 2 символа'),
  password: z.string().min(4, 'Пароль минимум 4 символа'),
  role: z.enum(['sewer', 'qc', 'supervisor', 'seller', 'technologist', 'cutter', 'ironing', 'customer']).default('sewer'),
  customerId: z.string().optional().nullable(),
})

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  username: z.string().min(2).optional(),
  password: z.string().min(4).optional(),
  role: z.enum(['sewer', 'qc', 'supervisor', 'seller', 'technologist', 'cutter', 'ironing', 'customer']).optional(),
  customerId: z.string().nullable().optional(),
})

// ---- Изделия ----
export const createProductSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  article: z.string().min(1, 'Артикул обязателен'),
  imageUrl: z.string().url().optional().nullable(),
  sewerRate: z.number().min(0).default(150),
  homeRate: z.number().min(0).default(0),
  qcRate: z.number().min(0).default(50),
  ironingRate: z.number().min(0).default(10),
  cuttingRate: z.number().min(0).default(30),
  reworkRate: z.number().min(0).default(80),
  payReworkToQC: z.boolean().default(false),
  isKit: z.boolean().default(false),
  kitComboColors: z.record(z.array(z.string())).optional().nullable(),
  sizes: z.array(z.string()).optional(),
  colors: z.array(z.object({ color: z.string().min(1), colorHex: z.string().default('#9ca3af') })).optional(),
})

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  article: z.string().min(1).optional(),
  imageUrl: z.string().url().nullable().optional(),
  sewerRate: z.number().min(0).optional(),
  homeRate: z.number().min(0).optional(),
  qcRate: z.number().min(0).optional(),
  ironingRate: z.number().min(0).optional(),
  cuttingRate: z.number().min(0).optional(),
  reworkRate: z.number().min(0).optional(),
  payReworkToQC: z.boolean().optional(),
  isKit: z.boolean().optional(),
  kitComboColors: z.record(z.array(z.string())).nullable().optional(),
  sizes: z.array(z.string()).optional(),
  colors: z.array(z.object({ color: z.string().min(1), colorHex: z.string().default('#9ca3af') })).optional(),
})

// ---- Планы ----
export const createPlanSchema = z.object({
  customerId: z.string().min(1, 'Выберите заказчика'),
  priority: z.enum(['urgent', 'normal', 'low']).default('normal'),
  deadline: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().min(1),
    size: z.string().min(1),
    color: z.string().min(1),
    colorHex: z.string().default('#9ca3af'),
    quantity: z.number().int().min(1),
  })).min(1, 'Добавьте хотя бы одну позицию'),
})

export const updatePlanSchema = z.object({
  status: z.enum(['draft', 'approved', 'in_work', 'shipped', 'shipped_paid']).optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    size: z.string().min(1),
    color: z.string().min(1),
    colorHex: z.string().default('#9ca3af'),
    quantity: z.number().int().min(1),
  })).optional(),
  addItems: z.array(z.object({
    productId: z.string().min(1),
    size: z.string().min(1),
    color: z.string().min(1),
    colorHex: z.string().default('#9ca3af'),
    quantity: z.number().int().min(1),
  })).optional(),
})

// ---- Задания швеям ----
export const createSewingTaskSchema = z.object({
  cuttingPlanId: z.string().min(1, 'Укажите план раскроя'),
  employeeId: z.string().min(1, 'Укажите швею'),
  items: z.array(z.object({
    productId: z.string().min(1),
    size: z.string().min(1),
    color: z.string().min(1),
    colorHex: z.string().default('#9ca3af'),
    quantity: z.number().int().min(1),
  })).min(1, 'Добавьте хотя бы одну позицию'),
})

export const updateSewingTaskSchema = z.object({
  status: z.enum(['issued', 'in_work', 'pending_ironing', 'pending_qc', 'completed']).optional(),
  items: z.array(z.object({
    id: z.string().min(1),
    status: z.string().optional(),
    actualQuantity: z.number().int().min(0).optional(),
    fabricDefect: z.number().int().min(0).optional(),
    defectNote: z.string().nullable().optional(),
  })).optional(),
  submitToQc: z.array(z.object({
    id: z.string().min(1),
    sendQty: z.number().int().min(1),
    actualQuantity: z.number().int().min(0),
    fabricDefect: z.number().int().min(0),
    defectNote: z.string().nullable().optional(),
  })).optional(),
})

// ---- Переделки ----
export const createSewingReworkSchema = z.object({
  sewingTaskItemId: z.string().min(1),
  sewingTaskId: z.string().min(1),
  quantity: z.number().int().min(1, 'Количество минимум 1'),
  reason: z.string().min(1, 'Укажите причину переделки'),
})

export const updateSewingReworkSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'pending_qc', 'completed']),
})

// ---- ВТО (утюжка) ----
export const ironingUpdateSchema = z.object({
  itemIds: z.array(z.string().min(1)).min(1, 'Выберите хотя бы одно изделие'),
})

// ---- Раскрой ----
export const createCuttingPlanSchema = z.object({
  planId: z.string().min(1, 'Укажите план пошива'),
  label: z.string().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().min(1),
    size: z.string().min(1),
    color: z.string().min(1),
    colorHex: z.string().default('#9ca3af'),
    plannedQty: z.number().int().min(1),
  })).min(1, 'Добавьте позиции'),
})

export const updateCuttingPlanSchema = z.object({
  status: z.enum(['in_work', 'cut']).optional(),
  items: z.array(z.object({
    id: z.string().min(1),
    actualQty: z.number().int().min(0).optional(),
  })).optional(),
})

// ---- Заказчики ----
export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  contactInfo: z.string().optional().nullable(),
  showMaterialBalance: z.boolean().default(false),
})

export const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  contactInfo: z.string().nullable().optional(),
  showMaterialBalance: z.boolean().optional(),
})

// ---- Логин ----
export const loginSchema = z.object({
  username: z.string().min(1, 'Введите логин'),
  password: z.string().min(1, 'Введите пароль'),
})

// ---- Утилита: валидация с удобным ответом ----
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const firstError = result.error.errors[0]
  return { success: false, error: firstError?.message || 'Неверные данные' }
}
