# Task 1: Add Proper Size Ordering to Sewing Production App

## Summary
Added `SIZE_ORDER` constant and `sortSizes` function to properly order clothing sizes (e.g., XXS before XS before S before M...) instead of default alphabetical sorting which incorrectly placed XXS after XXL.

## Changes Made

### 1. `/home/z/my-project/src/components/production-tabs.tsx`
- **Added** `SIZE_ORDER` constant array (line 41-46) with canonical clothing size ordering: XXS, 2XS, XS, S, M, L, XL, XXL, 2XL, 3XL, 4XL, 5XL, numeric sizes (80-164), EU sizes (42-64), and ONE SIZE
- **Added** `SIZE_ORDER_MAP` (line 48) - a Map for O(1) lookup of size positions
- **Added** `sortSizes()` function (line 50-58) - sorts sizes using SIZE_ORDER_MAP with fallback to numeric localeCompare for unknown sizes
- **Modified** `applySizeGrid` callback (line 2349-2356) - now calls `sortSizes()` after merging sizes from a size grid
- **Modified** `addProductSize` callback (line 2358-2365) - now calls `sortSizes()` after adding a new size
- **Modified** product sizes display in products table (line 2491) - sorts sizes inline using `SIZE_ORDER_MAP` before rendering

### 2. `/home/z/my-project/src/app/page.tsx`
- **Added** same `SIZE_ORDER`, `SIZE_ORDER_MAP`, and `sortSizes` function (lines 67-86)
- **Modified** product sizes display in ProductsTab (line 2370) - sorts sizes using inline `SIZE_ORDER_MAP` comparison
- **Modified** edit sizes display (line 2481) - uses `sortSizes()` for rendering
- **Modified** edit size addition (line 2482) - uses `sortSizes()` when adding sizes via input
- **Fixed** pre-existing broken code where old ProductsTab was partially removed (leftover code causing parsing error at line 2668)

## Lint Status
All lint checks pass with no errors.
