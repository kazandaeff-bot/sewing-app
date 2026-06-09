---
Task ID: 1
Agent: Main
Task: Fix customer creation validation error

Work Log:
- Analyzed screenshot: error was "Ошибка валидации" when creating customer
- Found root cause: Zod schema used `.optional()` but UI sent `null` for empty fields. Zod `.optional()` allows `undefined` but NOT `null`
- Fixed `CreateCustomerSchema`: all optional string fields now use `.nullable().optional()`
- Moved INN/KPP/BIK validation from `.refine()` to `.superRefine()` for better error messages
- Made INN non-required in UI (removed mandatory check in `handleSaveCustomer`, removed `*` from label)
- Updated `UpdateCustomerSchema` with same pattern
- Enhanced mutation error handlers to show validation details (field path + message)
- Created admin employee (username: admin, password: 123456) since DB was empty
- Tested all 3 scenarios: without INN (OK), with invalid INN (proper error), with valid INN (OK)

Stage Summary:
- Customer creation now works with or without INN
- Validation errors now show specific messages instead of generic "Ошибка валидации"
- Files modified: `src/lib/schemas.ts`, `src/components/tabs/references-tab.tsx`

---
Task ID: 2
Agent: Main
Task: Restore size grids and standard colors in product creation/edit dialogs

Work Log:
- Investigated: Two separate product dialogs exist — ProductsTab (simple, no grids/colors) and ReferencesTab (full-featured with grids/colors)
- User was seeing ProductsTab which lacked size grid selection and standard color presets
- Added `STANDARD_SIZE_GRIDS` and `STANDARD_COLORS` imports from `@/lib/constants`
- Added `ChevronUp`/`ChevronDown` imports for size reordering
- Enhanced Create dialog in ProductsTab: size grid dropdown, drag-reorderable sizes with ↑↓ buttons, standard color presets with colored dots, custom color with palette picker
- Enhanced Edit dialog in ProductsTab: same full-featured size/color UI
- Preserved all existing features: photo upload, rate fields, kit combos, rework reasons, size rates table
- Verified compilation: no errors, dev server running fine

Stage Summary:
- Both create and edit product dialogs now have size grids (8 presets) and standard colors (12 presets with palette)
- Files modified: `src/components/tabs/products-tab.tsx`

---
Task ID: 5
Agent: main
Task: Launch the sewing production app and fix mobile access

Work Log:
- Investigated server startup issues: Next.js processes kept getting OOM-killed
- Root cause: dev server with Turbopack uses ~1GB memory, OOM score 750+, killed by container OOM killer
- Production server uses ~220MB with OOM score 684, survives longer but still gets killed periodically
- Fixed HOSTNAME binding: changed from 0.0.0.0 to 127.0.0.1 (Caddy connects via localhost which resolves to IPv6 ::1, server needs to listen on 127.0.0.1)
- Created dynamic import page.tsx with ssr:false to reduce SSR memory usage
- Moved all page content to /src/components/home-page.tsx (client-only component)
- Created /src/app/page.tsx as thin wrapper with next/dynamic and ssr:false
- Created .zscripts/dev.sh for auto-restart production server
- Updated package.json dev script to use 127.0.0.1 binding
- Removed output: 'standalone' from next.config.ts (caused warning with next start)
- Server successfully runs on both port 3000 (direct) and port 81 (Caddy proxy)

Stage Summary:
- App is accessible at http://localhost:81 (Caddy) and http://localhost:3000 (direct)
- External URL: https://preview-6a1e857c.space.chatglm.site/
- Production server with auto-restart via .zscripts/dev.sh
- Key fix: HOSTNAME=127.0.0.1 (not 0.0.0.0) for Caddy compatibility
- Page component restructured: page.tsx → dynamic import → home-page.tsx (client-only)
