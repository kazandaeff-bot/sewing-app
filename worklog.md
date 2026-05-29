---
Task ID: 1-3
Agent: Main
Task: Architecture refactoring — extract types, hooks, utilities, split monolith

Work Log:
- Created `/home/z/my-project/src/types/index.ts` — unified type definitions (30+ types merged from 2 files)
- Created `/home/z/my-project/src/lib/formatters.ts` — shared formatting helpers (formatTiming, formatDate, getRoleLabel, filterByPeriod, getPeriodLabel, parseKitComboColors, getKitLabel, printDocument)
- Created `/home/z/my-project/src/lib/status-badges.tsx` — shared badge components (getColorDot, getStatusBadge, getReworkStatusBadge, getItemStatusBadge, getPlanStatusBadge, getCuttingStatusBadge, getSewingTaskStatusBadge, getBoxStatusBadge)
- Created `/home/z/my-project/src/hooks/use-item-rows.ts` — hook for plan item row management (eliminates triplication)
- Created `/home/z/my-project/src/hooks/use-product-color-select.ts` — hook for product/color select with kit combo (eliminates triplication)
- Extracted 15 tab components into `/home/z/my-project/src/components/tabs/`
- Rewrote page.tsx from 3499 to ~170 lines, production-tabs.tsx from 4844 to 10 lines

Stage Summary:
- page.tsx: 3499 → ~170 lines (95% reduction)
- production-tabs.tsx: 4844 → 10 lines (99.8% reduction)
- New infrastructure: types/index.ts, lib/formatters.ts, lib/status-badges.tsx, hooks/

---
Task ID: 4-7
Agent: Main
Task: Architecture refactoring Phase 2 — API client, salary hook, role constants, badge consolidation

Work Log:
- Created `/home/z/my-project/src/lib/api-client.ts` — shared API client (apiGet, apiPost, apiPatch, apiDelete, apiUpload) with error handling
- Created `/home/z/my-project/src/lib/constants.ts` — unified EMPLOYEE_ROLES, STANDARD_SIZE_GRIDS, STANDARD_COLORS, DEFAULT_IRONING_RATE
- Created `/home/z/my-project/src/hooks/use-salary-calculation.ts` — shared salary hook (useSalaryCalculation) eliminating 3x duplication
- Added getQcItemStatusBadge + getSellerPlanStatusBadge to status-badges.tsx
- Added EmployeeWithAuth, CustomerFormData, CustomerEditData, PlanDetailResponse, IroningGroup, MaterialType, MaterialEntry, MaterialNorm to types/index.ts
- Updated sewer-tab.tsx: useSalaryCalculation hook + apiGet/apiPatch, removed 25 lines of inline salary logic
- Updated qc-tab.tsx: useSalaryCalculation hook + apiGet/apiPost/apiPatch, removed getQcItemStatusBadge local def + 25 lines salary logic
- Updated ironing-tab.tsx: useSalaryCalculation hook + apiGet/apiPatch + DEFAULT_IRONING_RATE, removed 20 lines inline salary
- Updated references-tab.tsx: replaced EMPLOYEE_ROLES/STANDARD_SIZE_GRIDS/STANDARD_COLORS with imports from constants.ts, replaced EmployeeWithAuth with import from types, replaced inline parseKitComboColors with import from formatters
- Updated employees-tab.tsx: replaced roleOptions with EMPLOYEE_ROLES from constants.ts
- Updated city-distribution-tab.tsx: replaced getSellerPlanStatusBadge with import from status-badges.tsx
- Fixed getKitLabel in formatters.ts to accept optional kitComboColors
- Build passes, dev server returns 200

Stage Summary:
- Eliminated 3x salary calculation duplication (~120 lines) via useSalaryCalculation hook
- Unified role labels across 3 files (was: Продавец/Селлер, Раскройщик/Закройщик, Утюжка/ВТО conflict)
- Eliminated 2 local badge function re-implementations
- Added proper error handling to API calls via shared api-client
- Removed ~70 lines of duplicated constants
- Build: ✅ | Dev server: ✅ (HTTP 200)
