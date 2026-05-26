# Task 2: Add ability to delete individual sizes and colors from product's size grid and color list

## Summary
Enhanced the delete functionality for sizes and colors in the ReferencesTab's product dialog, making the UX more discoverable and intuitive.

## Changes Made

### File: `/home/z/my-project/src/components/production-tabs.tsx`

**Sizes section improvements:**
1. **Added "Очистить все" (Clear all) button** - A ghost-styled button with Trash2 icon that appears when there are sizes. Positioned on the right side of the header row (ml-auto). Allows users to remove all sizes at once.
2. **Enhanced X button on size badges** - Changed from a simple `X` icon with `cursor-pointer hover:text-red-500` to a proper `<button>` element with:
   - Larger icon size (h-3.5 w-3.5 instead of h-3 w-3)
   - Red background on hover (`hover:bg-red-100 hover:text-red-600`)
   - Smooth transition (`transition-colors`)
   - Accessible title attribute (`title="Удалить размер {size}"`)
   - Proper click target with padding (`p-0.5`)
3. **Better placeholder text** - Changed from "Размеры не добавлены" to "Размеры не добавлены — выберите сетку или введите вручную" to guide users how to add sizes.

**Colors section improvements:**
1. **Added header row with "Очистить все" button** - Same pattern as sizes. A clear-all button appears when colors exist.
2. **Enhanced X button on color badges** - Same improvements as size badges:
   - Larger icon size (h-3.5 w-3.5)
   - Red background on hover
   - Accessible title attribute (`title="Удалить цвет {color}"`)
   - Proper button element for accessibility
3. **Better placeholder text** - Changed from "Цвета не добавлены" to "Цвета не добавлены — выберите из списка или введите свой"

### File: `/home/z/my-project/src/app/page.tsx`
- Verified the ProductsTab was already removed (dead code cleanup was done previously)
- No changes needed - the product management functionality is entirely in ReferencesTab

## Technical Details
- The `removeProductSize` and `removeProductColor` callbacks were already implemented and working correctly
- The PATCH endpoint (`/api/products/[id]`) already handles deletion correctly by replacing all sizes/colors
- The improvements focus on UX discoverability rather than functional bugs

## Verification
- `bun run lint` passes with no errors
- Dev server compiles successfully
- Page loads with 200 status
