# Task: Redesign Materials & Norms Section in References Tab

## Summary
Successfully redesigned the materials section in the references tab component to support the new schema with category-based material types, base/input units, and conversion rates.

## Changes Made

### 1. `/home/z/my-project/src/components/tabs/references-tab.tsx`
- **State variables**: Replaced `newMaterialTypeUnit` → `newMaterialTypeCategory`, `newMaterialUnit` → `newMaterialBaseUnit`/`newMaterialInputUnit`/`newMaterialConversionRate`, `newMaterialQty` → `newMaterialInputQty`, `entryQty` → `entryInputQty`/`entryInputUnit`/`entryConversionRate`
- **Mutations**: Updated `createMaterialTypeMutation` to send `category` instead of `unit`; `createMaterialMutation` to send `baseUnit`, `inputUnit`, `conversionRate`, `totalQty` (as input qty); `createEntryMutation` to send `qty` (base), `inputQty`, `inputUnit`, `conversionRate`
- **Material Type Creation**: Now uses category dropdown (Ткань/Фурнитура) instead of unit text input
- **Material Type Display**: Shows category label badge instead of unit badge
- **Material Creation Form**: Now includes baseUnit selector, inputUnit selector, conditional conversionRate field, input qty field with live conversion preview
- **Material Display**: Shows baseUnit badge, inputUnit badge (if different), total qty with both units (e.g., "5 бобин → 500 м"), conversion rate badge (e.g., "1 бобина = 100 м")
- **Entry Dialog**: Shows current stock, input unit selector, input qty, conditional conversion rate, live calculation preview
- **History Dialog**: Shows base qty and input qty with units for entries that have conversion
- **Norms table**: Updated type cast for `baseUnit` instead of `unit`
- **All Materials memo**: Updated to include `baseUnit`, `inputUnit`, `conversionRate`, `category` fields

### 2. `/home/z/my-project/src/types/index.ts`
- `MaterialType`: Changed `unit: string` → `category: 'fabric' | 'furniture'`
- `Material`: Changed `unit: string` → `baseUnit: string`, added `inputUnit: string`, `conversionRate: number`
- `MaterialEntry`: Added `inputQty: number`, `inputUnit: string | null`, `conversionRate: number`
- `MaterialNorm.material`: Changed `unit: string` → `baseUnit: string`
- Related nested types updated for `category` and `baseUnit`

### 3. `/home/z/my-project/src/components/tabs/customer-materials-tab.tsx`
- Changed column header from "Ед." to "Ед. изм."
- Changed display from `mat.unit` to `mat.baseUnit || mat.unit` (fallback for backwards compatibility)

## Key Design Decisions
- Fabric category base units: пм, кг; input units: пм, кг
- Furniture category base units: шт, м; input units: шт, упак, бобина, м
- Conversion rate is shown only when inputUnit ≠ baseUnit
- When inputUnit == baseUnit, conversionRate defaults to 1 and is hidden
- Entry dialog auto-populates inputUnit and conversionRate from material but allows override
- All API endpoints were already updated and work correctly with the new fields
