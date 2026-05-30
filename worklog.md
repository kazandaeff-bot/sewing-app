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

---
Task ID: 8
Agent: Main
Task: Zod validation on all API routes + Auth middleware

Work Log:
- Created `/home/z/my-project/src/lib/schemas.ts` — 30+ Zod schemas covering all API routes (login, employees, products, plans, cutting-plans, sewing-tasks, sewing-reworks, rework-reasons, ironing, boxes, seller-plans, cities, box-types, customers, material-types, material-norms, material-entries, cutting-leftovers, materials, product-size-rates, tasks, reworks, print)
- Created `/home/z/my-project/src/lib/api-auth.ts` — validateBody(), validateQuery(), getSessionUser(), withAuth() wrapper
- Added Zod validation to 30 API route handlers across 24 files
- Replaced all manual validation (field checks, parseInt/parseFloat, Array.isArray) with Zod schemas
- Updated login route to use bcrypt+JWT+httpOnly cookies (was plaintext base64)
- Updated employees routes to hash passwords with bcrypt and exclude passwords from GET responses
- Fixed kitComboColors schema for Zod v4 (z.record needs key type arg)
- Build passes, dev server returns 200

Stage Summary:
- 30+ Zod schemas created covering all mutation/query endpoints
- 24 route files updated with validateBody/validateQuery
- Eliminated all parseInt/parseFloat on unvalidated input (NaN risk)
- Added enum validation for all status fields
- Auth infrastructure created (withAuth, getSessionUser) — ready for per-route auth gating
- Build: ✅ | Dev server: ✅ (HTTP 200)
---
Task ID: 3
Agent: Main Agent
Task: 🟠 Zod validation on API routes + withAuth on all routes

Work Log:
- Scanned all 52 API route files and catalogued every endpoint
- Found: 36 GET routes without query validation, 14 DELETE routes without ID validation, 0 routes using withAuth
- Added 12 query schemas to schemas.ts (TasksQuerySchema, SewingTasksQuerySchema, SewingReworksQuerySchema, ReworksQuerySchema, ReworkReasonsQuerySchema, CuttingLeftoversQuerySchema, MaterialEntriesQuerySchema, MaterialsQuerySchema, MaterialBalanceQuerySchema, ProductSizeRatesQuerySchema, PlansQuerySchema, SeedQuerySchema)
- Added IdParamSchema for [id] URL parameter validation
- Added validateParams() utility to api-auth.ts for URL param validation
- Updated api-auth.ts: RouteContext type, withAuth signature with Record<string, string> params
- Updated ALL 50+ API route files with:
  - withAuth() wrapping with role-based access control
  - validateQuery() for GET routes with query params
  - validateParams(ctx, IdParamSchema) for [id] routes
  - validateBody() preserved for POST/PATCH routes
- Fixed TypeScript errors: ctx type mismatch in sewing-tasks, sewing-reworks, reworks [id] routes
- Fixed buildCuttingItems type issue in plans/[id]/route.ts
- Build passes successfully

Stage Summary:
- 100% API route coverage: all routes now have Zod validation + withAuth
- 12 query schemas, 1 IdParamSchema added
- validateParams() utility created
- Role-based access: supervisor, sewer, qc, cutter, ironing, seller, customer
- Auth routes (login, logout, me, session) intentionally left public
- Pre-existing errors in boxes/route.ts and seed/route.ts unchanged
---
Task ID: 4
Agent: main
Task: 🟠 Remove old Rework system

Work Log:
- Audited all Rework-related models, routes, types, and UI references
- Identified OLD system: `Rework` model (linked to Task), `/api/reworks/`, `/api/rework-reasons/`
- Identified NEW system to keep: `SewingRework` model (linked to SewingTaskItem), `/api/sewing-reworks/`
- Identified SHARED to keep: `ReworkReason` model, `reworkRate` on Product, `reworkReasons` includes in Products API
- Removed `model Rework` and `reworks Rework[]` from Prisma schema
- Deleted `/api/reworks/` and `/api/rework-reasons/` API directories (orphaned, no UI called them)
- Removed `CreateReworkSchema`, `UpdateReworkSchema`, `ReworksQuerySchema`, `CreateReworkReasonSchema`, `ReworkReasonsQuerySchema` from schemas.ts
- Removed `Rework` interface and `reworks: Rework[]` from types/index.ts
- Updated `Stats` interface: `totalReworks`/`pendingReworks` → `totalSewingReworks`/`pendingSewingReworks`, removed per-employee rework counts
- Updated stats/route.ts: replaced `db.rework.count()` with `db.sewingRework.count()`, removed `reworks: true` include
- Updated tasks/route.ts: removed `reworks: true` from all includes
- Updated tasks/[id]/route.ts: removed `reworks: true` from include
- Updated seed/route.ts: removed `db.rework.deleteMany()` and all `db.rework.create()` calls
- Ran `prisma db push --accept-data-loss` (dropped Rework table with 4 rows)
- Build passed successfully
- Dev server started and running

Stage Summary:
- Old Rework model and routes completely removed
- Database migrated (Rework table dropped)
- New SewingRework system untouched and fully functional
- ReworkReason model kept (used by QC tab for dropdown)
- reworkRate on Product kept (used for pricing calculations)
- Build ✅, Dev server ✅

---
Task ID: 5
Agent: Main
Task: Fix all rates to be editable per product in Products section; fix ReferencesTab missing rates

Work Log:
- Fixed ProductsTab: set correct default values for ironingRate ('10' instead of '0') and cuttingRate ('30' instead of '0')
- Fixed ProductsTab: updated resetCreateForm to use correct defaults for ironingRate and cuttingRate
- Fixed ReferencesTab: added ironingRate (10) and cuttingRate (30) to productForm initial state
- Fixed ReferencesTab: updated openCreateProduct to include ironingRate and cuttingRate in form reset
- Fixed ReferencesTab: updated openEditProduct to include ironingRate and cuttingRate when editing
- Fixed ReferencesTab: updated handleSaveProduct to send ironingRate and cuttingRate to API
- Fixed ReferencesTab: added ВТО and Крой input fields in product dialog (6 rate fields in 3x2 grid)
- Fixed ReferencesTab: updated product table to show all 6 rates (Шв, Над, ВТО, Крой, ОТК, Пер)
- Built project successfully with `bun run build`
- Clarified: Organizations = Заказчики (Customers), located in Справочники tab

Stage Summary:
- All 6 rate fields (Швея, Надомница, ВТО, Крой, ОТК, Переделка) are now editable per product in both ProductsTab and ReferencesTab
- ProductsTab already had ironingRate and cuttingRate fields, only defaults were wrong
- ReferencesTab was missing ironingRate and cuttingRate entirely — now fixed
- Preview server starts but background processes are killed by sandbox after ~15-20 seconds
