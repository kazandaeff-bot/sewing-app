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
- Extracted 15 tab components into `/home/z/my-project/src/components/tabs/`:
  - item-timing-info.tsx, sewer-tab.tsx, qc-tab.tsx, ironing-tab.tsx
  - customer-materials-tab.tsx, employees-tab.tsx, products-tab.tsx
  - sewing-plans-tab.tsx, cutting-plans-tab.tsx, cutting-leftovers-tab.tsx
  - sewing-tasks-tab.tsx, city-distribution-tab.tsx, boxes-tab.tsx
  - stub-tab.tsx, references-tab.tsx
- Rewrote `/home/z/my-project/src/app/page.tsx` from 3499 lines to ~170 lines (only HomePage component + imports)
- Rewrote `/home/z/my-project/src/components/production-tabs.tsx` from 4844 lines to 10 lines (re-exports only)
- Build passes with zero errors

Stage Summary:
- **Before**: 8342 lines in 2 monolith files, 14 duplicate types, triplicated logic
- **After**: 15 focused tab files (200-1363 lines each), single source of truth for types/helpers
- page.tsx: 3499 → ~170 lines (95% reduction)
- production-tabs.tsx: 4844 → 10 lines (99.8% reduction, just re-exports)
- New infrastructure: types/index.ts, lib/formatters.ts, lib/status-badges.tsx, hooks/use-item-rows.ts, hooks/use-product-color-select.ts
