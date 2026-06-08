// ============ Shared Zod Validation Schemas ============
// Single source of truth for API request validation

import { z } from 'zod'
import { validateINN, validateKPP, validateBIK, validateCheckingAccount, validateCorrAccount } from './russian-requisites'

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
  items: z.array(PlanItemInput).default([]),  // empty = quick create (draft without items)
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

export const CustomerType = z.enum(['organization', 'ip', 'individual'])

export const CreateCustomerSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название'),
  type: CustomerType.default('organization'),
  inn: z.string().trim().nullable().optional(),
  kpp: z.string().trim().nullable().optional(),
  legalAddress: z.string().trim().nullable().optional(),
  postalAddress: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  bankName: z.string().trim().nullable().optional(),
  bik: z.string().trim().nullable().optional(),
  checkingAccount: z.string().trim().nullable().optional(),
  corrAccount: z.string().trim().nullable().optional(),
  bankCity: z.string().trim().nullable().optional(),
  contactInfo: z.string().trim().nullable().optional(),
}).superRefine((data, ctx) => {
  // INN validation: if provided, must pass checksum
  if (data.inn && data.inn.trim()) {
    const result = validateINN(data.inn)
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error || 'Неверный ИНН', path: ['inn'] })
    }
  }
  // KPP validation: if provided, must be valid
  if (data.kpp && data.kpp.trim()) {
    const result = validateKPP(data.kpp)
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error || 'Неверный КПП', path: ['kpp'] })
    }
  }
  // BIK validation: if provided, must be valid
  if (data.bik && data.bik.trim()) {
    const result = validateBIK(data.bik)
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error || 'Неверный БИК', path: ['bik'] })
    }
  }
  // Cross-field validation: checking account depends on BIK
  if (data.checkingAccount && data.bik) {
    const result = validateCheckingAccount(data.checkingAccount, data.bik)
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error || 'Неверный расчётный счёт', path: ['checkingAccount'] })
    }
  }
  // Cross-field validation: corr account depends on BIK
  if (data.corrAccount && data.bik) {
    const result = validateCorrAccount(data.corrAccount, data.bik)
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error || 'Неверный корр. счёт', path: ['corrAccount'] })
    }
  }
})

export const UpdateCustomerSchema = z.object({
  name: z.string().trim().min(1).optional(),
  type: CustomerType.optional(),
  inn: z.string().trim().nullable().optional(),
  kpp: z.string().trim().nullable().optional(),
  legalAddress: z.string().trim().nullable().optional(),
  postalAddress: z.string().trim().nullable().optional(),
  phone: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  bankName: z.string().trim().nullable().optional(),
  bik: z.string().trim().nullable().optional(),
  checkingAccount: z.string().trim().nullable().optional(),
  corrAccount: z.string().trim().nullable().optional(),
  bankCity: z.string().trim().nullable().optional(),
  contactInfo: z.string().trim().nullable().optional(),
  showMaterialBalance: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // INN validation: if provided and non-empty, must pass checksum
  if (data.inn && data.inn.trim()) {
    const result = validateINN(data.inn)
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error || 'Неверный ИНН', path: ['inn'] })
    }
  }
  // KPP validation
  if (data.kpp && data.kpp.trim()) {
    const result = validateKPP(data.kpp)
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error || 'Неверный КПП', path: ['kpp'] })
    }
  }
  // BIK validation
  if (data.bik && data.bik.trim()) {
    const result = validateBIK(data.bik)
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error || 'Неверный БИК', path: ['bik'] })
    }
  }
  // For update, we need the BIK to validate accounts — but BIK might be in the DB already
  // We only validate if BOTH bik and account are provided in this update
  if (data.checkingAccount && data.bik) {
    const result = validateCheckingAccount(data.checkingAccount, data.bik)
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error || 'Неверный расчётный счёт', path: ['checkingAccount'] })
    }
  }
  if (data.corrAccount && data.bik) {
    const result = validateCorrAccount(data.corrAccount, data.bik)
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error || 'Неверный корр. счёт', path: ['corrAccount'] })
    }
  }
})

// --- Material Types ---

export const CreateMaterialTypeSchema = z.object({
  name: z.string().trim().min(1, 'Укажите название'),
  category: z.enum(['fabric', 'furniture']).default('fabric'),
})

export const UpdateMaterialTypeSchema = z.object({
  name: z.string().trim().min(1).optional(),
  category: z.enum(['fabric', 'furniture']).optional(),
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
  inputQty: z.coerce.number().nonnegative().default(0),
  inputUnit: z.string().optional(),
  conversionRate: z.coerce.number().positive().default(1),
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
  baseUnit: z.string().default('шт'),
  inputUnit: z.string().default('шт'),
  conversionRate: z.coerce.number().positive().default(1),
  totalQty: z.coerce.number().nonnegative().default(0),
  ownershipType: z.enum(['own', 'customer']).default('own'),
  customerId: cuid.optional().nullable(),
})

export const UpdateMaterialSchema = z.object({
  name: z.string().trim().min(1).optional(),
  baseUnit: z.string().optional(),
  inputUnit: z.string().optional(),
  conversionRate: z.coerce.number().positive().optional(),
  totalQty: z.coerce.number().nonnegative().optional(),
  materialTypeId: cuid.optional(),
  ownershipType: z.enum(['own', 'customer']).optional(),
  customerId: cuid.optional().nullable(),
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

// --- Param schemas (for URL [id] segments) ---

export const IdParamSchema = z.object({
  id: cuid,
})

export const DealContactIdParamSchema = z.object({
  id: cuid,
  contactId: cuid,
})

// --- Query schemas (for GET request search params) ---

export const TasksQuerySchema = z.object({
  employeeId: cuid.optional(),
  status: z.string().optional(),
})

export const SewingTasksQuerySchema = z.object({
  employeeId: cuid.optional(),
  status: SewingTaskStatus.optional(),
})

export const SewingReworksQuerySchema = z.object({
  status: SewingReworkStatus.optional(),
  sewingTaskId: cuid.optional(),
})

export const CuttingLeftoversQuerySchema = z.object({
  status: z.string().optional(),
  customerId: cuid.optional(),
})

export const MaterialEntriesQuerySchema = z.object({
  materialId: cuid.optional(),
  type: MaterialEntryType.optional(),
  cuttingPlanId: cuid.optional(),
})

export const MaterialsQuerySchema = z.object({
  customerId: cuid.optional(),
})

export const MaterialBalanceQuerySchema = z.object({
  customerId: cuid,
})

export const ProductSizeRatesQuerySchema = z.object({
  productId: cuid,
})

export const PlansQuerySchema = z.object({
  customerId: cuid.optional(),
})

export const SeedQuerySchema = z.object({
  force: z.enum(['true']).optional(),
})

// --- Print ---

export const PrintQuerySchema = z.object({
  type: PrintType,
  id: cuid,
})

// --- Invoices ---

export const InvoiceStatus = z.enum(['draft', 'sent', 'paid', 'cancelled'])

const InvoiceItemInput = z.object({
  productId: cuid.optional(),
  description: z.string().min(1, 'Укажите наименование'),
  quantity: positiveInt,
  unit: z.string().default('шт'),
  price: z.coerce.number().nonnegative().default(0),
  amount: z.coerce.number().nonnegative().default(0),
  vatRate: z.coerce.number().nonnegative().nullable().optional(),
  vatAmount: z.coerce.number().nonnegative().nullable().optional(),
})

export const CreateInvoiceSchema = z.object({
  number: z.string().min(1, 'Укажите номер счёта'),
  date: z.string().optional(),
  customerId: cuid,
  planId: cuid.optional(),
  status: InvoiceStatus.default('draft'),
  dueDate: z.string().nullable().optional(),
  note: z.string().optional(),
  items: z.array(InvoiceItemInput).min(1, 'Добавьте хотя бы одну позицию'),
  vatRate: z.coerce.number().nonnegative().default(20),
})

export const UpdateInvoiceSchema = z.object({
  number: z.string().min(1).optional(),
  date: z.string().optional(),
  customerId: cuid.optional(),
  planId: cuid.nullable().optional(),
  status: InvoiceStatus.optional(),
  dueDate: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  items: z.array(InvoiceItemInput).optional(),
  vatRate: z.coerce.number().nonnegative().optional(),
})

// --- UPD ---

export const UPDStatus = z.enum(['draft', 'confirmed', 'sent', 'signed'])
export const UPDOperationType = z.enum(['shipment', 'transfer', 'return'])

const UPDItemInput = z.object({
  productId: cuid.optional(),
  description: z.string().min(1, 'Укажите наименование'),
  quantity: positiveInt,
  unit: z.string().default('шт'),
  price: z.coerce.number().nonnegative().default(0),
  amount: z.coerce.number().nonnegative().default(0),
  vatRate: z.coerce.number().nonnegative().nullable().optional(),
  vatAmount: z.coerce.number().nonnegative().nullable().optional(),
})

export const CreateUPDSchema = z.object({
  number: z.string().min(1, 'Укажите номер УПД'),
  date: z.string().optional(),
  customerId: cuid,
  invoiceId: cuid.optional(),
  sellerPlanId: cuid.optional(),
  status: UPDStatus.default('draft'),
  operationType: UPDOperationType.default('shipment'),
  note: z.string().optional(),
  items: z.array(UPDItemInput).min(1, 'Добавьте хотя бы одну позицию'),
  vatRate: z.coerce.number().nonnegative().default(20),
})

export const UpdateUPDSchema = z.object({
  number: z.string().min(1).optional(),
  date: z.string().optional(),
  customerId: cuid.optional(),
  invoiceId: cuid.nullable().optional(),
  sellerPlanId: cuid.nullable().optional(),
  status: UPDStatus.optional(),
  operationType: UPDOperationType.optional(),
  note: z.string().nullable().optional(),
  items: z.array(UPDItemInput).optional(),
  vatRate: z.coerce.number().nonnegative().optional(),
})

// --- Deals (CRM) ---

export const DealStatus = z.enum(['new', 'negotiation', 'agreed', 'won', 'lost', 'suspended'])

export const CreateDealSchema = z.object({
  title: z.string().min(1, 'Укажите название сделки'),
  customerId: cuid,
  status: DealStatus.default('new'),
  amount: z.coerce.number().nonnegative().nullable().optional(),
  description: z.string().optional(),
  result: z.string().optional(),
  nextStep: z.string().optional(),
  deadline: z.string().nullable().optional(),
})

export const UpdateDealSchema = z.object({
  title: z.string().min(1).optional(),
  customerId: cuid.optional(),
  status: DealStatus.optional(),
  amount: z.coerce.number().nonnegative().nullable().optional(),
  description: z.string().nullable().optional(),
  result: z.string().nullable().optional(),
  nextStep: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
})

// --- Deal Contacts ---

export const DealContactType = z.enum(['meeting', 'call', 'email', 'note'])

export const CreateDealContactSchema = z.object({
  dealId: cuid,
  date: z.string().optional(),
  type: DealContactType.default('meeting'),
  result: z.string().optional(),
  description: z.string().optional(),
  nextStep: z.string().optional(),
})

export const UpdateDealContactSchema = z.object({
  date: z.string().optional(),
  type: DealContactType.optional(),
  result: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  nextStep: z.string().nullable().optional(),
})

// --- Contracts ---

export const ContractType = z.enum(['service', 'supply'])
export const ContractStatus = z.enum(['draft', 'active', 'completed', 'terminated'])

export const CreateContractSchema = z.object({
  number: z.string().min(1, 'Укажите номер договора'),
  date: z.string().optional(),
  customerId: cuid,
  type: ContractType.default('service'),
  status: ContractStatus.default('draft'),
  subject: z.string().optional(),
  amount: z.coerce.number().nonnegative().nullable().optional(),
  vatRate: z.coerce.number().min(-1).default(20),  // -1 = Без НДС, 0 = 0%, 10/20 = rate%
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  paymentTerms: z.string().optional(),
  deliveryTerms: z.string().optional(),
  note: z.string().optional(),
  planId: cuid.optional(),
  invoiceId: cuid.optional(),
})

export const UpdateContractSchema = z.object({
  number: z.string().min(1).optional(),
  date: z.string().optional(),
  customerId: cuid.optional(),
  type: ContractType.optional(),
  status: ContractStatus.optional(),
  subject: z.string().nullable().optional(),
  amount: z.coerce.number().nonnegative().nullable().optional(),
  vatRate: z.coerce.number().min(-1).optional(),  // -1 = Без НДС
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  paymentTerms: z.string().nullable().optional(),
  deliveryTerms: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  planId: cuid.nullable().optional(),
  invoiceId: cuid.nullable().optional(),
})

// --- Rework Reasons ---

export const CreateReworkReasonSchema = z.object({
  productId: cuid,
  text: z.string().min(1, 'Укажите причину переделки'),
})

export const ReworkReasonsQuerySchema = z.object({
  productId: cuid.optional(),
})

// --- Reworks (Legacy) ---

export const CreateReworkSchema = z.object({
  taskId: cuid,
  quantity: positiveInt,
  reason: z.string().min(1, 'Укажите причину переделки'),
})

export const ReworksQuerySchema = z.object({
  status: z.string().optional(),
})

export const UpdateReworkSchema = z.object({
  status: z.string().min(1),
})

// --- Pattern Pieces ---

export const CreatePatternPieceSchema = z.object({
  name: z.string().min(1, 'Укажите название детали'),
  size: z.string().nullable().optional(),
  points: z.array(z.any()),  // Array of {x, y} coordinate objects
  width: z.coerce.number().nonnegative().default(0),
  height: z.coerce.number().nonnegative().default(0),
  grainAngle: z.coerce.number().default(0),
  seamAllowance: z.coerce.number().default(0),
  quantity: z.coerce.number().int().positive().default(1),
  notches: z.array(z.any()).nullable().optional(),
  scaleCalibration: z.any().nullable().optional(),
})

export const UpdatePatternPieceSchema = z.object({
  name: z.string().min(1).optional(),
  size: z.string().nullable().optional(),
  points: z.array(z.any()).optional(),
  width: z.coerce.number().nonnegative().optional(),
  height: z.coerce.number().nonnegative().optional(),
  grainAngle: z.coerce.number().optional(),
  seamAllowance: z.coerce.number().optional(),
  quantity: z.coerce.number().int().positive().optional(),
  notches: z.array(z.any()).nullable().optional(),
  scaleCalibration: z.any().nullable().optional(),
})

export const PatternPieceIdParamSchema = z.object({
  id: cuid,
  pieceId: cuid,
})

// --- Nesting Layouts ---

const NestingItemInput = z.object({
  patternPieceId: cuid,
  x: z.coerce.number().default(0),
  y: z.coerce.number().default(0),
  rotation: z.coerce.number().default(0),
  flipped: z.boolean().default(false),
})

export const CreateNestingLayoutSchema = z.object({
  name: z.string().min(1, 'Укажите название раскладки'),
  patternId: cuid.optional(),
  fabricWidth: z.coerce.number().positive('Укажите ширину ткани'),
  items: z.array(NestingItemInput).default([]),
})

export const UpdateNestingLayoutSchema = z.object({
  name: z.string().min(1).optional(),
  fabricWidth: z.coerce.number().positive().optional(),
  fabricLength: z.coerce.number().positive().optional(),
  utilization: z.coerce.number().min(0).max(100).optional(),
  status: z.string().optional(),
  items: z.array(NestingItemInput).optional(),
})
