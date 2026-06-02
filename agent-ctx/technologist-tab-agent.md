# Task: Technologist Tab Component

## Summary
Created the Technologist tab component (Лекала / Pattern editor) at `/home/z/my-project/src/components/tabs/technologist-tab.tsx` and integrated it into the main page.

## Files Created/Modified
- **Created**: `src/components/tabs/technologist-tab.tsx` — Full-featured pattern digitization component
- **Modified**: `src/app/page.tsx` — Integrated TechnologistTab for technologist role + added "Лекала" menu item for supervisors

## Component Features

### Pattern List View
- Grid of pattern cards showing name, product, status badge (draft=yellow, ready=green, archived=gray), piece count
- Filter by status (all/draft/ready/archived)
- "Новое лекало" button opens create dialog
- Click card navigates to detail view

### Create Pattern Dialog
- Name, product selector (from /api/products), description fields
- On create, auto-navigates to the new pattern's detail view

### Pattern Detail View
- Header with pattern name, product info, status badge
- Status transition buttons (draft→ready, ready→archived)
- Delete pattern with confirmation
- List of pieces as cards with mini SVG preview
- Each piece card shows: name, size, width×height, quantity, seam allowance, grain angle
- Edit/delete buttons per piece
- "Добавить деталь" button

### Piece Editor (SVG-based)
- SVG canvas with 1cm grid lines (minor + major every 10cm)
- Grid labels showing cm coordinates
- Background image upload for reference (semi-transparent overlay)
- Click to add polygon points
- Close polygon by clicking near first point (5px threshold with visual indicator)
- Drag points to adjust position
- Right-click or undo button to remove last point
- Seam allowance visualization (offset polygon, dashed)
- Grain direction line (purple, click 2 points to set)
- Zoom in/out buttons + mouse wheel zoom
- Pan with Ctrl+click or middle mouse button
- Fit-to-points and reset view buttons
- Cursor coordinate display (in cm)
- Sidebar with piece properties: name (dropdown), size, seam allowance slider, quantity spinner, grain angle display
- Calculated width/height from bounding box
- Save button (POST for new, PATCH for existing)

### API Integration
- Uses existing API routes: GET/POST /api/patterns, GET/PATCH/DELETE /api/patterns/[id], POST/PATCH/DELETE /api/patterns/[id]/pieces/[pieceId]
- Uses `authFetch` from auth-provider for authenticated requests
- TanStack Query for data fetching and cache invalidation

## Integration
- Technologist role: Sidebar with "Лекала" tab → TechnologistTab
- Supervisor role: "Лекала" menu item added under "Справочники" group

## Lint/TypeScript Status
- No lint errors in new code
- No TypeScript compilation errors
- Pre-existing lint errors in sewing-tasks-tab.tsx remain unchanged
