// ============ Shared Zod Validation Schemas ============
// Single source of truth for API request validation

import { z } from 'zod'

// --- Reusable primitives ---

export const cuid = z.string().min(1)
export const positiveInt = z.coerce.number().int().positive()
export const nonNegInt = z.coerce.number().int().nonnegative()
export const rateField = z.coerce.number().nonnegative().default(0)

// --- Enums ---

export const EmployeeRole = z.enum([
  'sewer', 'qc', 'supervisor', 'seller', 'technologist', 'cutter', 'ironing', 'customer',
])

export const PlanStatus = z.enum(['draft', 'approved', 'in_work', 'shipped', 'shipped_paid'])
export const PlanPriority = z.enum(['urgent', 'normal', 'low'])

export const CuttingPlanStatus = z.enum(['in_work', 'cut'])

export const SewingTaskStatus = z.enum(['issued', 'in_work', 'pending_ironing', 'pending_qc', 'completed'])
export const SewingItemStatus = z.enum(['issued', 'in_work', 'pending_ironing', 'ironed', 'pending_qc', 'completed'])

export const SewingReworkStatus = z.enum(['pending', 'in_progress', 'pending_qc', 'completed'])

export const BoxStatus = z.enum(['forming', 'assembled', 'checked', 'shipped'])

export const SellerPlanStatus = z.enum(['draft', 'approved', 'distributed'])

export const CuttingLeftoverStatus = z.enum(['available', 'in_work', 'completed'])

export const MaterialEntryType = z.enum(['incoming', 'consumed'])

export const PrintType = z.enum(['cutting-plan', 'sewing-task', 'packing-list'])

// --- Auth ---

export const LoginSchema = z.object({
  username: z.string().min(1, 'Укажите имя пользователя'),
  password: z.string().min(1, 'Укажите пароль'),
})

// --- Employees ---

export const CreateEmployeeSchema = z.object({
  name: z.string().min(1, 'Укажите ФИО'),
  code: z.string().min(1, 'Укажите код'),
  username: z.string().min(1, 'Укажите логин'),
  password: z.string().min(1, 'Укажите пароль'),
  role: EmployeeRole.default('sewer'),
  customerId: cuid.optional(),
})

export const UpdateEmployeeSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  role: EmployeeRole.optional(),
  customerId: z.string().nullable().optional(),
})

// --- Products ---

const ColorEntry = z.object({
  color: z.string().min(1),
  colorHex: z.string().default('#9ca3af'),
})

export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Укажите название'),
  article: z.string().min(1, 'Укажите артикул'),
  imageUrl: z.string().optional(),
  sewerRate: rateField,
  homeRate: rateField,
  qcRate: rateField,
  ironingRate: rateField,
  cuttingRate: rateField,
  reworkRate: rateField,
  isKit: z.boolean().default(false),
  kitComboColors: z.union([z.string(), z.record(z.string(), z.array(z.string()))]).nullable().optional(),
  sizes: z.array(z.string()).default([]),
  colors: z.array(ColorEntry).default([]),
})

export const UpdateProductSchema = CreateProductSchema.partial()

// --- Plans ---

const PlanItemInput = z.object({
  productId: cuid,
  size: z.string().min(1),
  color: z.string().min(1),
  colorHex: z.string().default('#9ca3af'),
  quantity: positiveInt,
})

export const CreatePlanSchema = z.object({
  customerId: cuid,
  items: z.array(PlanItemInput).min(1, 'Добавьте хотя бы одну позицию'),
  priority: PlanPriority.default('normal'),
  deadline: z.string().nullable().optional(),
})

export const UpdatePlanSchema = z.object({
  name: z.string().optional(),
  status: PlanStatus.optional(),
  items: z.array(PlanItemInput).optional(),
  addItems: z.array(PlanItemInput).optional(),
  priority: PlanPriority.optional(),
  deadline: z.string().nullable().optional(),
})

// --- Cutting Plans ---

export const UpdateCuttingPlanSchema = z.object({
  status: CuttingPlanStatus.optional(),
  label: z.string().nullable().optional(),
  items: z.array(z.object({
    id: cuid,
    actualQty: nonNegInt.optional(),
  })).optional(),
})

// --- Sewing Tasks ---

export const CreateSewingTaskSchema = z.object({
  cuttingPlanId: cuid,
  employeeId: cuid,
  items: z.array(PlanItemInput).min(1),
})

export const UpdateSewingTaskSchema = z.object({
  status: SewingTaskStatus.optional(),
  items: z.array(z.object({
    id: cuid,
    status: SewingItemStatus.optional(),
    actualQuantity: nonNegInt.optional(),
    fabricDefect: nonNegInt.optional(),
    defectNote: z.string().nullable().optional(),
    sendQty: positiveInt.optional(),
  })).optional(),
  submitToQc: z.array(z.object({
    id: cuid,
    sendQty: positiveInt,
    actualQuantity: positiveInt,
    fabricDefect: nonNegInt.optional(),
    defectNote: z.string().nullable().optional(),
  })).optional(),
})

// --- Sewing Reworks ---

export const CreateSewingReworkSchema = z.object({
  sewingTaskItemId: cuid,
  sewingTaskId: cuid,
  quantity: positiveInt,
  reason: z.string().min(1, 'Укажите причину переделки'),
})

export const UpdateSewingReworkSchema = z.object({
  status: SewingReworkStatus,
})

// --- Rework Reasons ---

export const CreateReworkReasonSchema = z.object({
  productId: cuid,
  text: z.string().min(1, 'Укажите причину'),
})

// --- Ironing ---

export const IroningUpdateSchema = z.object({
  itemIds: z.array(cuid).min(1, 'Выберите хотя бы одно изделие'),
})

// --- Boxes ---

export const CreateBoxSchema = z.object({
  sellerPlanId: cuid,
})

export const UpdateBoxSchema = z.object({
  status: BoxStatus.optional(),
  items: z.array(z.object({
    id: cuid,
    actualQty: nonNegInt.optional(),
  })).optional(),
})

// --- Seller Plans ---

const SellerPlanCityInput = z.object({
  city: z.string().min(1),
  quantity: positiveInt,
})

const SellerPlanItemInput = z.object({
  productId: cuid,
  size: z.string().min(1),
  color: z.string().min(1),
  colorHex: z.string().default('#9ca3af'),
  quantity: positiveInt,
  cities: z.array(SellerPlanCityInput).default([]),
})

export const CreateSellerPlanSchema = z.object({
  sellerName: z.string().min(1, 'Укажите название'),
  customerId: cuid.optional(),
  planId: cuid.optional(),
  items: z.array(SellerPlanItemInput).default([]),
})

export const UpdateSellerPlanSchema = z.object({
  sellerName: z.string().min(1).optional(),
  customerId: cuid.nullable().optional(),
  status: SellerPlanStatus.optional(),
  items: z.array(SellerPlanItemInput).optional(),
})

export const AvailableItemsQuerySchema = z.object({
  customerId: cuid,
})

// --- Cities ---

export const CreateCitySchema = z.object({
  name: z.string().trim().min(1, 'Укажите название города'),
})

// --- Box Types ---

const CapacityInput = z.object({
  productId: cuid,
  size: z.string().min(1),
  maxQty: positiveInt,
})

export const CreateBoxTypeSchema = z.object({
  name: z.string().min(1, 'Укажите название'),
  dimensions: z.string().optional(),
  capacities: z.array(CapacityInput).default([]),
})

export const UpdateBoxTypeSchema = CreateBoxTypeSchema.partial()

// --- Customers ---

export const CreateCustomerSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название'),
  contactInfo: z.string().trim().optional(),
})

export const UpdateCustomerSchema = z.object({
  name: z.string().trim().min(1).optional(),
  contactInfo: z.string().trim().nullable().optional(),
  showMaterialBalance: z.boolean().optional(),
})

// --- Material Types ---

export const CreateMaterialTypeSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название'),
  unit: z.string().default('шт'),
})

export const UpdateMaterialTypeSchema = z.object({
  name: z.string().trim().min(1).optional(),
  unit: z.string().optional(),
})

// --- Material Norms ---

export const CreateMaterialNormSchema = z.object({
  materialId: cuid,
  productId: cuid,
  consumptionPerUnit: z.coerce.number().positive('Расход должен быть > 0'),
  unit: z.string().default('гр'),
  autoCalculated: z.boolean().default(false),
})

export const UpdateMaterialNormSchema = z.object({
  consumptionPerUnit: z.coerce.number().positive().optional(),
  unit: z.string().optional(),
  autoCalculated: z.boolean().optional(),
})

// --- Material Entries ---

export const CreateMaterialEntrySchema = z.object({
  materialId: cuid,
  type: MaterialEntryType,
  qty: z.coerce.number().positive('Количество должно быть > 0'),
  date: z.string().optional(),
  cuttingPlanId: cuid.optional(),
  note: z.string().optional(),
})

// --- Cutting Leftovers ---

export const CreateCuttingLeftoverSchema = z.object({
  cuttingPlanId: cuid,
  cuttingPlanItemId: cuid.optional(),
  productId: cuid,
  size: z.string().min(1),
  color: z.string().min(1),
  colorHex: z.string().default('#9ca3af'),
  quantity: positiveInt,
  source: z.string().default('cutting'),
  note: z.string().nullable().optional(),
})

export const UpdateCuttingLeftoverSchema = z.object({
  sewnQty: nonNegInt.optional(),
  status: CuttingLeftoverStatus.optional(),
  note: z.string().nullable().optional(),
  quantity: positiveInt.optional(),
})

// --- Materials ---

export const CreateMaterialSchema = z.object({
  materialTypeId: cuid,
  name: z.string().trim().min(1, 'Укажите название'),
  unit: z.string().default('шт'),
  totalQty: z.coerce.number().nonnegative().default(0),
})

export const UpdateMaterialSchema = z.object({
  name: z.string().trim().min(1).optional(),
  unit: z.string().optional(),
  totalQty: z.coerce.number().nonnegative().optional(),
  materialTypeId: cuid.optional(),
})

// --- Product Size Rates ---

export const CreateProductSizeRateSchema = z.object({
  productId: cuid,
  size: z.string().min(1),
  sewerRate: z.coerce.number().nonnegative().nullable().optional(),
  homeRate: z.coerce.number().nonnegative().nullable().optional(),
  qcRate: z.coerce.number().nonnegative().nullable().optional(),
  ironingRate: z.coerce.number().nonnegative().nullable().optional(),
  cuttingRate: z.coerce.number().nonnegative().nullable().optional(),
})

export const UpdateProductSizeRateSchema = z.object({
  id: cuid,
  sewerRate: z.coerce.number().nonnegative().optional(),
  homeRate: z.coerce.number().nonnegative().optional(),
  qcRate: z.coerce.number().nonnegative().optional(),
  ironingRate: z.coerce.number().nonnegative().optional(),
  cuttingRate: z.coerce.number().nonnegative().optional(),
})

export const DeleteProductSizeRateSchema = z.object({
  id: cuid,
})

// --- Tasks (Legacy) ---

export const CreateTaskSchema = z.object({
  employeeId: cuid,
  productId: cuid,
  size: z.string().min(1),
  color: z.string().min(1),
  colorHex: z.string().default('#9ca3af'),
  quantity: positiveInt,
})

export const UpdateTaskSchema = z.object({
  actualQuantity: nonNegInt.optional(),
  fabricDefect: nonNegInt.optional(),
  defectNote: z.string().nullable().optional(),
  status: z.string().optional(),
  colorHex: z.string().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  quantity: positiveInt.optional(),
  employeeId: cuid.optional(),
  productId: cuid.optional(),
})

// --- Reworks (Legacy) ---

export const CreateReworkSchema = z.object({
  taskId: cuid,
  quantity: positiveInt,
  reason: z.string().min(1, 'Укажите причину'),
})

export const UpdateReworkSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'pending_qc', 'completed']),
})

// --- Print ---

export const PrintQuerySchema = z.object({
  type: PrintType,
  id: cuid,
})
