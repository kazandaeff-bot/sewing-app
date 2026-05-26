# Task 7 - Materials Tracking System

## Summary
Implemented a comprehensive materials tracking system for the sewing production app, including fabric, accessories, and size-labels inventory with automatic average consumption calculation.

## Changes Made

### 1. Prisma Schema (`prisma/schema.prisma`)
- Added `MaterialType` model - types of materials (fabric, accessories, threads, etc.) with units
- Added `Material` model - individual materials with stock tracking (totalQty, unit)
- Added `MaterialEntry` model - incoming/consumed entries with date, cuttingPlanId link, notes
- Added `MaterialNorm` model - consumption norms per material+product with autoCalculated flag
- Added `materialNorms` relation to Product model
- Unique constraint on `[materialId, productId]` for MaterialNorm
- Ran `npx prisma db push` successfully

### 2. API Routes

#### `/api/material-types/route.ts`
- GET: list all material types with `_count.materials`
- POST: create material type (name, unit) with unique constraint error handling

#### `/api/material-types/[id]/route.ts`
- PATCH: update material type
- DELETE: delete material type

#### `/api/materials/route.ts`
- GET: list all materials with type, entries, and norms. Supports `?materialTypeId=xxx` filter
- POST: create material. If initial stock > 0, auto-creates an "incoming" entry

#### `/api/materials/[id]/route.ts`
- GET: single material with full details
- PATCH: update material (name, totalQty)
- DELETE: delete material

#### `/api/material-entries/route.ts`
- GET: list entries with filters (materialId, type, cuttingPlanId)
- POST: create entry (incoming/consumed). Key feature:
  - Auto-updates totalQty on the material
  - Validates stock for consumed entries
  - **Auto-calculation**: When consumed entry linked to a cuttingPlanId, triggers `autoCalculateNorms()`

#### `/api/material-entries/[id]/route.ts`
- DELETE: delete entry and reverse the stock change

#### `/api/material-norms/route.ts`
- GET: list norms with filters (materialId, productId)
- POST: create or upsert norm (uses `upsert` for materialId+productId)

#### `/api/material-norms/[id]/route.ts`
- PATCH: update norm
- DELETE: delete norm

### 3. Auto-calculation Logic (`autoCalculateNorms` in material-entries route)
When creating a consumed MaterialEntry linked to a cuttingPlanId:
1. Finds all consumed entries for this material + cutting plan
2. Finds total actualQty from cutting plan items
3. Calculates `consumptionPerUnit = totalConsumed / totalActualQty`
4. Upserts MaterialNorm records for each product in the cutting plan with `autoCalculated: true`
- Non-blocking: if auto-calc fails, the entry still gets created

### 4. UI - Materials Section in ReferencesTab
Added "Материалы" section AFTER "Заказчики" section in ReferencesTab, including:

- **Material Types**: Badge-based list with inline add form (name + unit select) and delete
- **Materials Table**: Name, Type, Stock, Unit, Norms count, Delete action. Clickable rows open detail dialog
- **Material Detail Dialog**: 
  - Stock info cards (name, type, remaining stock with color coding)
  - Entry history table (date, type with icons, qty, note, delete)
  - Add entry button
  - Norms table (product, consumption per unit, unit, auto/manual badge, delete)
  - Add norm button
- **Add Material Dialog**: Name, Type (auto-sets unit), Unit select, Initial stock
- **Add Entry Dialog**: Type (incoming/consumed), Qty, Date, Cutting plan link (for consumed), Note, Auto-calc hint
- **Add Norm Dialog**: Product select, Consumption per unit, Unit

### State & Queries Added
- Material types/materials/entries/norms state variables
- Queries: materialTypes, materials, cuttingPlans
- Mutations: createMaterialType, deleteMaterialType, createMaterial, deleteMaterial, createEntry, deleteEntry, createNorm, deleteNorm

### Icons Added
- `Boxes`, `ArrowDownCircle`, `ArrowUpCircle`, `Calculator` from lucide-react

## Files Created
- `src/app/api/material-types/route.ts`
- `src/app/api/material-types/[id]/route.ts`
- `src/app/api/materials/route.ts`
- `src/app/api/materials/[id]/route.ts`
- `src/app/api/material-entries/route.ts`
- `src/app/api/material-entries/[id]/route.ts`
- `src/app/api/material-norms/route.ts`
- `src/app/api/material-norms/[id]/route.ts`

## Files Modified
- `prisma/schema.prisma` - Added 4 new models + Product relation
- `src/components/production-tabs.tsx` - Added materials section, state, queries, mutations, dialogs

## Verification
- `bun run lint` passes with no errors
- `npx prisma db push` completed successfully
- Dev server compiles without errors (tested GET /api/material-types returning [])
