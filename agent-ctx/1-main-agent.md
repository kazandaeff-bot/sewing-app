# Work Log — Task 1: Fix Mutation Error Handling & Mobile Responsiveness

## Issue 1: Plan Creation Error (Mutation Error Handling)

### Problem
All mutations in `sewing-plans-tab.tsx` (except `statusMutation`) did NOT check if the HTTP response was OK before parsing JSON. This meant:
- 400/500 responses would still trigger `onSuccess` instead of `onError`
- Users saw success toasts like "План создан" even when the request failed
- Actual error messages from the server were silently lost

### Files Modified

#### `/src/components/tabs/sewing-plans-tab.tsx`
Fixed 5 mutations to properly check `r.ok` and throw errors:

1. **`createMutation`** — Now uses `async (r) => { const result = await r.json(); if (!r.ok) throw new Error(result.error || 'Не удалось создать план'); return result }`
2. **`deleteMutation`** — Same pattern, throws `'Не удалось удалить план'` on failure
3. **`updatePlanMutation`** — Same pattern, throws `'Не удалось обновить план'` on failure
4. **`supplementMutation`** — Same pattern, throws `'Не удалось дополнить план'` on failure
5. **`quickCreateMutation`** — Same pattern, throws `'Не удалось создать план'` on failure

All `onError` handlers were updated from `() => {}` to `(err: Error) => { toast({ description: err.message }) }` so the actual server error message is shown to the user.

Note: `statusMutation` already had proper error handling and was left unchanged.

#### `/src/components/tabs/cutting-plans-tab.tsx`
Fixed `updateMutation` — same pattern, throws `'Не удалось обновить план раскроя'`.

#### `/src/components/tabs/sewing-tasks-tab.tsx`
Fixed `updateStatusMutation` — same pattern, throws `'Не удалось обновить статус'`.

#### `/src/components/tabs/boxes-tab.tsx`
Fixed `updateBoxMutation` — same pattern, throws `'Не удалось обновить короб'`.

Note: `generateMutation` in boxes-tab already had proper error handling.

---

## Issue 2: Mobile Responsiveness

### `/src/components/ui/dialog.tsx`
Changed `DialogContent` base classes to make dialogs full-screen on mobile:
- **Mobile (<640px):** `top-0 left-0 h-[100dvh] max-h-[100dvh] rounded-none p-3` — dialogs take full viewport height with no border radius
- **Desktop (≥640px):** `sm:top-[50%] sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:h-auto sm:max-h-[90vh] sm:max-w-[calc(100%-1rem)] sm:rounded-lg` — retains original centered modal behavior

### `/src/components/tabs/sewing-plans-tab.tsx`

**Dialog overflow fixes:**
- All DialogContent instances: changed `max-h-[90vh]` to `max-h-[85vh]` for better mobile viewport usage
- All ScrollArea inside dialogs: changed `max-h-[70vh]` to `max-h-[65vh] sm:max-h-[70vh]` with responsive padding `pr-2 sm:pr-4`

**renderItemRow — mobile stacking:**
- Changed `flex items-end gap-2 flex-wrap` to `flex flex-col sm:flex-row sm:items-end gap-2` — fields stack vertically on mobile, horizontal on desktop
- Changed fixed widths to responsive: `w-24` → `sm:w-24`, `w-28` → `sm:w-28`, `w-16` → `sm:w-16`, `w-20` → `sm:w-20` — fields expand full-width on mobile
- Changed `min-w-[140px]` to `sm:min-w-[140px]` on product select

**Main plans table — mobile compact:**
- Hidden less-important columns on small screens: `Заказчик` (hidden < md), `Позиций` (hidden < sm), `Раскрой` (hidden < lg), `Дата` (hidden < md)
- Reduced action button text on mobile: button labels hidden on mobile (`<span className="hidden sm:inline">Утвердить</span>`), icons remain visible
- Adjusted button margin: `mr-1` → `sm:mr-1` on action icons
- Reduced action button gap: `gap-2` → `gap-1 sm:gap-2`

**Quick input grid:**
- Already had `overflow-x-auto` wrapper (no change needed — the grid is horizontally scrollable)

### `/src/app/page.tsx`
- Mobile layout already uses `px-3 py-4` padding — no changes needed

---

## Build Verification
- `npx next build` — ✅ Compiled successfully
- Dev server returns HTTP 200 on `/` route
- All lint errors are pre-existing (debug files, carousel, qc-salaries-tab) — not related to these changes
