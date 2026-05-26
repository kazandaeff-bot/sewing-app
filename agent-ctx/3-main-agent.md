# Task 3: Remove Duplicate "Изделия" Tab from Supervisor's Tab Bar

## Summary
Successfully removed the duplicate "Изделия" (Products) tab from the supervisor's tab bar in `/home/z/my-project/src/app/page.tsx`, since the same functionality exists and is better implemented in the Справочники (References) tab.

## Changes Made

### 1. Removed "Изделия" Tab Trigger
Removed from the supervisor's `TabsList`:
```tsx
<TabsTrigger value="products" className="gap-1.5"><Package className="h-4 w-4" /><span className="hidden sm:inline">Изделия</span><span className="sm:hidden">Изделия</span></TabsTrigger>
```

### 2. Removed "Изделия" TabsContent
Removed from the supervisor's tab content area:
```tsx
<TabsContent value="products" className="mt-6"><ProductsTab /></TabsContent>
```

### 3. Removed ProductsTab Function
Removed the entire `ProductsTab` function definition (~260 lines of dead code) that was no longer referenced after removing the tab.

### 4. Cleaned Up Unused Imports
Removed imports that were only used by the ProductsTab:
- `Package` (lucide-react icon)
- `BarChart3` (lucide-react icon)
- `Shirt` (lucide-react icon)
- `ChevronRight` (lucide-react icon)
- `Truck` (lucide-react icon)
- `Image as ImageIcon` (lucide-react icon)
- `Progress` (@/components/ui/progress)
- `Separator` (@/components/ui/separator)
- `ScrollArea` (@/components/ui/scroll-area)
- `Checkbox` (@/components/ui/checkbox)

### Kept Intact
- `getColorDot` helper — still used by QCTab, EmployeesTab, and other components
- `Сотрудники` (Employees) tab — kept as requested (only Изделия was duplicated)
- `Справочники` (References) tab — kept, this is where products are now managed
- All type definitions (Product, ProductSize, ProductColor, ReworkReason) — still used by other tabs

## Verification
- ✅ ESLint passes with no errors (`bun run lint`)
- ✅ Dev server compiles successfully
- ✅ No TypeScript errors
- ✅ Supervisor's tab bar now shows: Планы пошива, Раскрой, Задания швеям, Швеи, ОТК, Города, Короба, Сотрудники, Справочники
