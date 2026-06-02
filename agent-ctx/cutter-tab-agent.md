# Cutter Tab Implementation

## Task
Create the Cutter (Закройщик) tab component for the sewing production app — the Nesting (Раскладка лекал) tool where cutters arrange pattern pieces on fabric.

## What was done

### 1. Created `/src/components/tabs/cutter-tab.tsx`
Full-featured nesting layout component with:

- **List View**: Shows nesting layouts as cards with name, pattern name, fabric width, utilization %, status badges (draft=yellow, arranged=blue, confirmed=green). Filter by status. Click to open editor. Delete button on hover.

- **Create Nesting Layout Dialog**: Name field, pattern selector (only ready status), fabric width input (default 150cm). Auto-adds all pieces from selected pattern.

- **Nesting Canvas (HTML5 Canvas)**: 
  - Rectangle representing fabric (width × estimated length in cm)
  - Scale: 1 unit = 1 cm with zoom control (scroll wheel + buttons)
  - Grid lines every 10cm, major lines every 50cm, with cm labels
  - Each pattern piece rendered as a colored semi-transparent polygon at (x, y) position
  - Pieces draggable with mouse (with snap-to-grid option, 1cm snap)
  - Selected piece controls: rotate (90° increments), flip, delete
  - Color-coded pieces by pattern piece type (10 color palette)
  - Piece name labels inside each piece
  - Coordinate transforms: screen ↔ fabric cm
  - HiDPI support

- **Sidebar Controls**:
  - Utilization % badge with progress bar
  - Layout info: fabric width (editable), calculated length, piece count
  - Status controls: draft → arranged → confirmed
  - "Сохранить" button to persist positions
  - "Автоматическая раскладка" button → POST /api/nesting/[id]/auto-arrange
  - "Пересчитать" button → recalculate utilization
  - Piece list with positions and rotation info

- **Drag and Drop**: Mouse down starts drag, mouse move updates position, mouse up marks for save. Snap to grid option.

- **API Integration**: All endpoints integrated (GET/POST/PATCH/DELETE + auto-arrange)

### 2. Updated `/src/app/page.tsx`
- Imported `CutterTab` component
- Replaced cutter role stub with full sidebar + CutterTab
- Added "Раскладка" menu item to supervisor menu (Production group)
- Added `case 'nesting': return <CutterTab />` to supervisor render

### Technical Decisions
- Used `effectiveLocalItems` pattern: derives from server data when no unsaved changes, uses local state only during editing
- Canvas uses device pixel ratio for sharp rendering on HiDPI displays
- Piece transformations (rotation, flip) applied via canvas context transforms
- Color mapping stable by patternPieceId across renders

### Lint Status
No new lint errors introduced (4 pre-existing errors from other files remain).
