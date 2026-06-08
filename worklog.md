---
Task ID: 1
Agent: main
Task: Redesign materials system with unit conversion, ownership types, and auto-deduction

Work Log:
- Studied current Prisma schema (Material, MaterialType, MaterialEntry, MaterialNorm models)
- Studied current UI in references-tab.tsx and customer-materials-tab.tsx
- Studied API routes for materials, material-types, material-entries, material-balance, cutting-plans

Schema changes:
- MaterialType: removed `unit` field, added `category` field ('fabric' | 'furniture')
- Material: removed `unit` field, added `baseUnit`, `inputUnit`, `conversionRate` fields
- MaterialEntry: added `inputQty`, `inputUnit`, `conversionRate` fields
- Applied Prisma migration (reset DB)

API changes:
- POST /api/material-types: now accepts `category` instead of `unit`
- POST /api/materials: now accepts `baseUnit`, `inputUnit`, `conversionRate`, `totalQty` (in input units, converts to base)
- POST /api/material-entries: now accepts `inputQty`, `inputUnit`, `conversionRate`, calculates `qty` in base units
- GET /api/material-balance: updated to use `baseUnit` instead of old `unit`
- PATCH /api/cutting-plans/[id]: auto-deduction logic updated to include conversion fields

UI changes:
- Material Type creation: Category dropdown (Ткань/Фурнитура) instead of unit input
- Material creation: baseUnit selector (пм,кг for fabric; шт,м for furniture), inputUnit selector (пм,кг for fabric; шт,упак,бобина,м for furniture), conditional conversionRate, inputQty with live preview
- Material display: shows baseUnit, inputUnit, total qty with conversion info, ownership badges
- Material entry dialog: input unit selector, conversion rate, live calculation preview
- History dialog: shows both base and input quantities with conversion
- Customer materials tab: updated to use baseUnit

Stage Summary:
- All schema, API, and UI changes completed successfully
- App compiles and runs without errors on port 3000
- Auto-deduction of materials after cutting already existed and was updated
