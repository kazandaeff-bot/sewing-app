# Task: Pattern Digitization Module Enhancement

## Task ID: pattern-digitization-enhancement
## Agent: Main Agent

## Summary

Enhanced the Pattern Digitization Module (Технолог → Лекала) with 5 new features:

### 1. Scale Calibration by Ruler (Калибровка по линейке)
- Added `scaleCalibration` field to `PatternPiece` model in Prisma schema
- Added `ScaleCalibration` type to `src/types/index.ts`
- Created `src/components/pattern/scale-calibration.tsx` with:
  - `ScaleCalibrationControl` — toolbar button that toggles calibration mode
  - `ScaleCalibrationOverlay` — SVG overlay showing calibration points (Л1, Л2) and connecting line
  - `ScaleCalibrationDialog` — dialog asking for real distance in cm, calculates `pixelsPerMm`
- Calibration info shown in canvas info bar: "Масштаб: 1 пикс = X мм"

### 2. Camera Capture with Guide Overlay (Съёмка с направляющими)
- Created `src/components/pattern/camera-capture.tsx`
- Uses `navigator.mediaDevices.getUserMedia` for live camera preview
- Guide overlay drawn on canvas over video:
  - Semi-transparent capture zone with dashed border
  - Ruler zone in bottom-right corner (highlighted amber, labeled "Линейка сюда")
  - Crosshair at center
  - Perspective grid lines and convergence lines
  - Text hints: "Расположите линейку в отмеченной зоне", "Держите телефон параллельно поверхности"
- "Снять" button captures frame → becomes background image
- "Переснять" button to retake
- "Использовать" button confirms and applies image as PieceEditor background

### 3. Symmetry (Симметрия)
- Created `src/components/pattern/symmetry-dialog.tsx`
- Three symmetry axis options:
  - Вертикальная (left-right mirror)
  - Горизонтальная (top-bottom mirror)
  - Произвольная (custom axis with 2 clicks on canvas)
- Preview with dashed mirror axis and ghost outline for mirrored half
- Creates combined symmetric contour (original + mirrored reversed)
- Grain line is preserved
- Custom axis: user clicks "Указать на холсте" → dialog closes → canvas enters axis selection mode → 2 clicks → dialog reopens with custom axis

### 4. Plotter Export (Экспорт для плоттера)
- Created `src/components/pattern/pattern-export.tsx`
- Generates clean SVG at 1:1 scale (1 SVG unit = 1mm)
- All pieces properly positioned (no overlap) with row layout
- Each piece includes: contour line (solid), seam allowance (dashed), grain line (dash-dot with arrow), piece name label, size label
- 1cm reference square in corner
- Download as `pattern-{name}-plotter.svg`

### 5. A4 Tiling Export (Разбивка на А4)
- Same export dialog, "А4" option
- Generates multiple SVG files for 210×297mm A4 pages
- Each page includes:
  - Alignment marks (crosshairs + small triangles) at corners
  - Page number label (A1, A2, B1, B2 grid format)
  - Small overview map showing current page position
  - Dashed cut lines at page boundaries
  - Overlap zone (5mm) highlighted for gluing
  - 1cm reference square
- Sequential download of individual SVG files

## Files Modified

1. `prisma/schema.prisma` — Added `scaleCalibration String?` to PatternPiece
2. `src/types/index.ts` — Added `ScaleCalibration` interface and field to `PatternPiece`
3. `src/lib/schemas.ts` — Added `ScaleCalibrationSchema` and field to `PatternPieceInput`
4. `src/app/api/patterns/[id]/pieces/route.ts` — Handle scaleCalibration in create, parse in response
5. `src/app/api/patterns/[id]/pieces/[pieceId]/route.ts` — Handle scaleCalibration in update, parse in response
6. `src/app/api/patterns/[id]/route.ts` — Parse scaleCalibration in response
7. `src/components/tabs/technologist-tab.tsx` — Integrated all new components and features

## Files Created

1. `src/components/pattern/scale-calibration.tsx` — Calibration mode components
2. `src/components/pattern/camera-capture.tsx` — Camera capture dialog with guide overlay
3. `src/components/pattern/symmetry-dialog.tsx` — Symmetry axis selection and preview
4. `src/components/pattern/pattern-export.tsx` — Export dialog (plotter + A4 tiling)

## Database Changes

- `npx prisma db push` — Applied scaleCalibration column
- `npx prisma generate` — Regenerated Prisma client

## Build Status

- Build: ✅ Successful (no errors)
- Lint: ✅ No new errors (pre-existing errors in unrelated files only)
- Server: ✅ Running on port 3000
