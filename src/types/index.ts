// ============ Shared Types for Sewing Production Platform ============
// Merged from page.tsx and production-tabs.tsx to eliminate duplication

// --- Core Entities ---

export interface Employee {
  id: string
  name: string
  code: string
  role: string
}

export interface ProductSize {
  id: string
  size: string
}

export interface ProductColor {
  id: string
  color: string
  colorHex: string
}

export interface ReworkReason {
  id: string
  productId: string
  text: string
}

export interface Product {
  id: string
  name: string
  article: string
  imageUrl?: string | null
  sewerRate: number
  homeRate: number
  qcRate: number
  reworkRate: number
  ironingRate: number
  cuttingRate: number
  isKit: boolean
  kitComboColors?: string | Record<string, string[]> | null
  reworkReasons: ReworkReason[]
  sizes: ProductSize[]
  colors: ProductColor[]
}

// --- Plan Types ---

export interface PlanItem {
  id: string
  productId: string
  size: string
  color: string
  colorHex: string
  quantity: number
  product: Product
}

export interface Plan {
  id: string
  name: string
  status: string
  customerId: string | null
  customer: { id: string; name: string } | null
  items: PlanItem[]
  cuttingPlans: Array<{ id: string; status: string; label: string | null }>
  priority: string // urgent | normal | low
  deadline: string | null
  createdAt: string
}

// --- Cutting Types ---

export interface CuttingPlanItem {
  id: string
  productId: string
  size: string
  color: string
  colorHex: string
  plannedQty: number
  actualQty: number | null
  product: Product
}

export interface CuttingLeftover {
  id: string
  cuttingPlanId: string
  cuttingPlanItemId: string | null
  productId: string
  size: string
  color: string
  colorHex: string
  quantity: number
  sewnQty: number
  status: string
  source: string
  note: string | null
  product: { id: string; name: string; article: string }
  cuttingPlan: {
    id: string
    plan: {
      id: string; name: string
      customer: { id: string; name: string } | null
    }
  }
  createdAt: string
}

export interface CuttingPlan {
  id: string
  planId: string
  status: string
  label: string | null
  items: CuttingPlanItem[]
  sewingTasks: SewingTaskBrief[]
  leftovers: CuttingLeftover[]
  plan: { id: string; name: string }
  createdAt: string
}

// --- Sewing Task Types ---

export interface SewingTaskBrief {
  id: string
  employeeId: string
  status: string
  employee: Employee
}

export interface SewingTaskItem {
  id: string
  productId: string
  size: string
  color: string
  colorHex: string
  quantity: number
  product: Product
}

export interface SewingTask {
  id: string
  cuttingPlanId: string
  employeeId: string
  status: string
  items: SewingTaskItem[]
  cuttingPlan: { id: string; plan: { id: string; name: string } }
  employee: Employee
  createdAt: string
}

// Full sewing task response with extended item data (used in SewerTab, QCTab, IroningTab)
export type SewingTaskStatus = 'issued' | 'in_work' | 'pending_ironing' | 'pending_qc' | 'completed'

export interface SewingTaskResponse {
  id: string
  cuttingPlanId: string
  employeeId: string
  status: SewingTaskStatus
  cuttingPlan: { id: string; plan: { id: string; name: string } }
  employee: { id: string; name: string; code: string }
  items: SewingTaskItemResponse[]
  reworks: SewingReworkResponse[]
  createdAt: string
  updatedAt: string
}

export interface SewingTaskItemResponse {
  id: string
  status: string // issued | in_work | pending_ironing | ironed | pending_qc | completed
  sewingTaskId: string
  productId: string
  size: string
  color: string
  colorHex: string
  quantity: number
  actualQuantity: number | null
  fabricDefect: number
  defectNote: string | null
  startedAt: string | null
  ironedAt: string | null
  qcAt: string | null
  completedAt: string | null
  product: { id: string; name: string; article: string; sewerRate: number; qcRate: number; reworkRate: number }
  reworks: SewingReworkResponse[]
}

export type SewingReworkStatus = 'pending' | 'in_progress' | 'pending_qc' | 'completed'

export interface SewingReworkResponse {
  id: string
  sewingTaskItemId: string
  sewingTaskId: string
  quantity: number
  reason: string
  status: SewingReworkStatus
  sewingTaskItem: { id: string; product: { name: string; qcRate: number }; size: string; color: string }
  sewingTask: { id: string; employee: { name: string } }
  createdAt: string
  updatedAt: string
}

// --- Seller / Distribution Types ---

export interface SellerPlanCity {
  id: string
  city: string
  quantity: number
}

export interface SellerPlanItem {
  id: string
  productId: string
  size: string
  color: string
  colorHex: string
  quantity: number
  product: Product
  cities: SellerPlanCity[]
}

export interface SellerPlan {
  id: string
  sellerName: string
  status: string
  customerId: string | null
  customer: { id: string; name: string } | null
  items: SellerPlanItem[]
  boxes: Box[]
  createdAt: string
}

// --- Box Types ---

export interface BoxItem {
  id: string
  productId: string
  size: string
  color: string
  colorHex: string
  plannedQty: number
  actualQty: number | null
  product: Product
}

export interface Box {
  id: string
  sellerPlanId: string
  boxNumber: number
  city: string
  status: string
  items: BoxItem[]
  sellerPlan: { id: string; sellerName: string }
  createdAt: string
}

// --- Other Shared Types ---

export interface City {
  id: string
  name: string
}

export interface BoxTypeCapacity {
  id: string
  productId: string
  size: string
  maxQty: number
  product?: Product
}

export interface BoxType {
  id: string
  name: string
  dimensions: string
  capacities: BoxTypeCapacity[]
}

// Legacy task model (old system, to be removed)
export interface TaskWithRelations {
  id: string
  employeeId: string
  productId: string
  size: string
  color: string
  colorHex: string
  quantity: number
  status: string
  actualQuantity: number | null
  fabricDefect: number
  defectNote: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  employee: Employee
  product: Product
  reworks: Rework[]
}

// Legacy rework model (old system, to be removed)
export interface Rework {
  id: string
  taskId: string
  quantity: number
  reason: string
  status: string
  createdAt: string
  updatedAt: string
  task?: TaskWithRelations
}

// Dashboard stats
export interface Stats {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  pendingQcTasks: number
  newTasks: number
  totalReworks: number
  pendingReworks: number
  totalFabricDefects: number
  perEmployee: {
    id: string
    name: string
    code: string
    role: string
    totalTasks: number
    completed: number
    inProgress: number
    pendingQc: number
    new: number
    totalDefects: number
    totalReworks: number
    pendingReworks: number
  }[]
}

// --- Plan Item Row (for create/edit/supplement dialogs) ---

export interface PlanItemRow {
  productId: string
  size: string
  color: string
  colorHex: string
  quantity: number
}

// --- Extended Employee with auth fields (used in ReferencesTab) ---

export interface EmployeeWithAuth extends Employee {
  username: string
  password?: string
}

// --- Customer with edit fields ---

export interface CustomerFormData {
  name: string
  contactInfo: string
  showMaterialBalance: boolean
}

export interface CustomerEditData extends CustomerFormData {
  id: string
}

// --- Plan Detail Response (for sewing-plans detail view) ---

export interface PlanDetailResponse extends Plan {
  items: PlanItem[]
  cuttingPlans: CuttingPlan[]
}

// --- Ironing Group (from /api/ironing) ---

export interface IroningGroup {
  task: SewingTaskResponse
  items: SewingTaskItemResponse[]
}

// --- Material Types & Entries ---

export interface MaterialType {
  id: string
  name: string
  unit: string
  entries: MaterialEntry[]
}

export interface MaterialEntry {
  id: string
  materialTypeId: string
  date: string
  quantity: number
  pricePerUnit: number
  totalCost: number
  note: string | null
  customerId: string | null
  customer: { id: string; name: string } | null
  createdAt: string
}

// --- Material Norm ---

export interface MaterialNorm {
  id: string
  productId: string
  materialTypeId: string
  quantityPerUnit: number
  product: { id: string; name: string; article: string }
  materialType: { id: string; name: string; unit: string }
}
