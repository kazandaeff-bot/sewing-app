# Task: Refactor sewing production platform — extract tabs from page.tsx

## Summary

Successfully refactored the monolithic `page.tsx` (~3325 lines) into modular, well-organized components. The page went from ~3325 lines to **172 lines** — a reduction of **~3150 lines** (far exceeding the 150-200 line target).

## Deliverables Written to `/home/z/my-project/download/refactored/`

### 1. `sewer-tab.tsx` (639 lines)
- Extracted `SewerTab` component (ШВЕЯ tab)
- Imports: `Employee`, `TaskWithRelations`, `Rework`, `Product` from `@/types`
- Imports: `getColorDot`, `getStatusBadge`, `getReworkStatusBadge` from `@/lib/helpers`
- Features: employee selection, task management, salary calculation with product breakdown, rework handling

### 2. `qc-tab.tsx` (620 lines)
- Extracted `QCTab` component (ОТК tab)
- Imports: `Employee`, `TaskWithRelations`, `Rework`, `Product`, `ReworkReason` from `@/types`
- Imports: `getColorDot`, `getStatusBadge`, `getReworkStatusBadge` from `@/lib/helpers`
- Features: QC inspection, rework creation with reason selection, QC salary calculation, pending rework verification

### 3. `supervisor-tab.tsx` (969 lines)
- Extracted 3 components: `TasksTab`, `EmployeesTab`, `ProductsTab`
- Imports: `Employee`, `TaskWithRelations`, `Product`, `ReworkReason`, `EMPLOYEE_ROLES` from `@/types`
- Imports: `getColorDot`, `getStatusBadge`, `getRoleLabel` from `@/lib/helpers`
- TasksTab: CRUD for tasks with status filtering, create/edit/delete dialogs
- EmployeesTab: CRUD for employees with role selection (uses EMPLOYEE_ROLES constant)
- ProductsTab: CRUD for products with sizes, colors, rework reasons management

### 4. `page.tsx` (172 lines) — REFACTORED
- Removed ALL duplicate type definitions (10+ interfaces were inline, now imported from `@/types`)
- Removed ALL duplicate helper functions (4 functions were inline, now imported from `@/lib/helpers`)
- Imports `SewerTab` from `@/components/tabs/sewer-tab`
- Imports `QCTab` from `@/components/tabs/qc-tab`
- Imports `TasksTab`, `EmployeesTab`, `ProductsTab` from `@/components/tabs/supervisor-tab`
- Keeps existing imports from `@/components/production-tabs`
- Imports `getRoleLabel` from `@/lib/helpers`
- Main HomePage component preserved with role-based rendering logic

### 5. `helpers.tsx` (115 lines) — UPDATED
- Added `getStatusBadge` (task status badges: new, in_progress, pending_qc, completed)
- Added `getReworkStatusBadge` (rework status badges: pending, in_progress, pending_qc, completed)
- Preserved existing: `getColorDot`, `getPlanStatusBadge`, `getCuttingStatusBadge`, `getSewingTaskStatusBadge`, `getBoxStatusBadge`, `formatDate`, `getRoleLabel`

### 6. `index.ts` (247 lines) — UPDATED types
- Added missing types: `ReworkReason`, `Rework`, `TaskWithRelations`, `Stats`
- Updated `Product` to include `imageUrl?`, `reworkReasons: ReworkReason[]`
- Updated `BoxType` to include `capacities: BoxTypeCapacity[]`
- Updated `BoxTypeCapacity` to include `product?: Product`
- Preserved all existing types from dump (2)

## Key Design Decisions

1. **Types as source of truth**: The `@/types` module is now the single source of truth. `Product` was extended to include `imageUrl?` and `reworkReasons` to match the page.tsx usage.

2. **Helpers centralized**: `getStatusBadge` and `getReworkStatusBadge` were added to `@/lib/helpers` since they were used by multiple tabs but not present in the existing helpers file.

3. **EMPLOYEE_ROLES constant**: The `EmployeesTab` originally had a local `roleOptions` array that duplicated `EMPLOYEE_ROLES` from `@/types`. Refactored to use `EMPLOYEE_ROLES` directly, ensuring consistency.

4. **Supervisor tabs grouped together**: `TasksTab`, `EmployeesTab`, and `ProductsTab` are all supervisor-only tabs, so they share a single file. This keeps the component count manageable while still providing good separation.

5. **No behavioral changes**: The refactoring is purely structural. All functionality, UI, and data flows remain identical to the original.
