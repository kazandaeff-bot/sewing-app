// ============ Unified Types for Sewing Production ============

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
  isKit: boolean
  kitComboColors: Record<string, string[]> | null
  reworkReasons: ReworkReason[]
  sizes: ProductSize[]
  colors: ProductColor[]
}

// Employee without password (safe for API responses and frontend)
export interface Employee {
  id: string
  name: string
  code: string
  username: string
  role: string
}

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
  items: PlanItem[]
  cuttingPlan: CuttingPlan | null
  createdAt: string
}

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

export interface CuttingPlan {
  id: string
  planId: string
  status: string
  items: CuttingPlanItem[]
  sewingTasks: SewingTaskBrief[]
  plan: { id: string; name: string }
  createdAt: string
}

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
  items: SellerPlanItem[]
  boxes: Box[]
  createdAt: string
}

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

export interface BoxType {
  id: string
  name: string
  dimensions: string | null
  capacities: BoxTypeCapacity[]
}

export interface BoxTypeCapacity {
  id: string
  boxTypeId: string
  productId: string
  size: string
  maxQty: number
  product?: Product
}

export interface City {
  id: string
  name: string
}

// Role definitions
export const EMPLOYEE_ROLES = [
  { value: 'sewer', label: 'Швея' },
  { value: 'qc', label: 'ОТК' },
  { value: 'supervisor', label: 'Руководитель' },
  { value: 'seller', label: 'Продавец' },
  { value: 'technologist', label: 'Технолог' },
  { value: 'cutter', label: 'Раскройщик' },
  { value: 'ironing', label: 'Утюжка' },
] as const
