# Task: Extract Tab Components from production-tabs.tsx Monolith

## Task ID: extract-tabs-from-monolith

## Summary

Extracted 8 tab function components from the 4844-line monolith file `/home/z/my-project/src/components/production-tabs.tsx` into separate files under `/home/z/my-project/src/components/tabs/`.

## Files Created

| # | Tab Component | File | Lines | Key Changes |
|---|--------------|------|-------|-------------|
| 1 | **SewingPlansTab** | `sewing-plans-tab.tsx` | 962 | Replaced triplicated add/remove/update + product/color select with `useItemRows` and `useProductColorSelect` hooks. Extracted `renderItemRow` helper to avoid JSX duplication across 3 dialogs. |
| 2 | **CuttingPlansTab** | `cutting-plans-tab.tsx` | 209 | Replaced inline `handlePrint` with `printDocument` from `@/lib/formatters`. |
| 3 | **SewingTasksTab** | `sewing-tasks-tab.tsx` | 503 | Replaced inline `handlePrint` with `printDocument` from `@/lib/formatters`. |
| 4 | **CityDistributionTab** | `city-distribution-tab.tsx` | 648 | Kept local `getSellerPlanStatusBadge` (specific to this tab). |
| 5 | **BoxesTab** | `boxes-tab.tsx` | 359 | Renamed shadowed `handlePrint` to `handleBoxPrint` and fixed call site to pass `box.id` (was `handlePrint('packing-list', box.id)` which passed wrong arg). Uses custom print implementation from `/api/boxes/print/`. |
| 6 | **StubTab** | `stub-tab.tsx` | 14 | Simple extraction. |
| 7 | **ReferencesTab** | `references-tab.tsx` | 1363 | Includes Material Entry Dialog and Material History Dialog (relocated from CuttingLeftoversTab where they referenced undefined state). Local `EmployeeWithAuth` type extends shared `Employee` with `username`. Local `getRoleLabel` uses `EMPLOYEE_ROLES` constant. |
| 8 | **CuttingLeftoversTab** | `cutting-leftovers-tab.tsx` | 231 | Kept local `getLeftoverStatusBadge`. Material Entry/History dialogs moved to ReferencesTab (their state lives there). |

## Key Refactoring Changes

### 1. Type Deduplication
- ALL inline type definitions removed and replaced with `import type { ... } from '@/types'`
- ReferencesTab: Local `EmployeeWithAuth` extends shared `Employee` with `username` field needed for that tab

### 2. Helper Deduplication
- `parseKitComboColors` → `import { parseKitComboColors } from '@/lib/formatters'`
- `getKitLabel` → `import { getKitLabel } from '@/lib/formatters'`
- `formatDate` → `import { formatDate } from '@/lib/formatters'`
- `handlePrint` → `import { printDocument } from '@/lib/formatters'` (renamed to avoid confusion)
- `getColorDot` → `import { getColorDot } from '@/lib/status-badges'`
- `getPlanStatusBadge` → `import { getPlanStatusBadge } from '@/lib/status-badges'`
- `getCuttingStatusBadge` → `import { getCuttingStatusBadge } from '@/lib/status-badges'`
- `getSewingTaskStatusBadge` → `import { getSewingTaskStatusBadge } from '@/lib/status-badges'`
- `getBoxStatusBadge` → `import { getBoxStatusBadge } from '@/lib/status-badges'`

### 3. SewingPlansTab Hook Refactoring (Critical)
**Before (triplicated for create/edit/supplement dialogs):**
```tsx
const [planItems, setPlanItems] = useState([...])
const addPlanItemRow = useCallback(...)
const removePlanItemRow = useCallback(...)
const updatePlanItem = useCallback(...)
const handleProductChange = useCallback(...)
const handleColorSelect = useCallback(...)
// Same for editItems/addEditItemRow/removeEditItemRow/updateEditItem/handleEditProductChange/handleEditColorSelect
// Same for supplementItems/addSupplementItemRow/removeSupplementItemRow/updateSupplementItem/handleSupplementProductChange/handleSupplementColorSelect
```

**After (using shared hooks):**
```tsx
const createRows = useItemRows()
const editRows = useItemRows([])
const supplementRows = useItemRows()
const createColorSelect = useProductColorSelect(createRows.setRows)
const editColorSelect = useProductColorSelect(editRows.setRows)
const supplementColorSelect = useProductColorSelect(supplementRows.setRows)
```

Plus extracted `renderItemRow()` helper function to avoid repeating the same JSX 3 times.

### 4. Bug Fix in BoxesTab
Original code shadowed the global `handlePrint` with a local one that takes `(boxId: string)`, but the call site used `handlePrint('packing-list', box.id)` which would pass `'packing-list'` as the boxId. Fixed by:
- Renaming local function to `handleBoxPrint`
- Changing call site to `handleBoxPrint(box.id)`

### 5. Material Dialogs Relocation
The Material Entry Dialog and Material History Dialog (lines 4728-4844 in original) were inside CuttingLeftoversTab's return, but referenced state variables (`entryDialogOpen`, `historyDialogOpen`, `createEntryMutation`, `materialEntries`, etc.) that only exist in ReferencesTab. Moved these dialogs to ReferencesTab where their state is properly scoped.

## Verification
- All 8 files pass ESLint (`npx eslint src/components/tabs/` — no errors)
- Dev server running without compilation errors
- Total extracted: 4289 lines (from 4844-line monolith, reduction of ~12% due to deduplication)
