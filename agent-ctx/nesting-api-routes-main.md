# Task: Nesting API Routes

## Agent: Main Developer
## Status: Completed

## Summary
Created 3 API route files for the Nesting (Раскладка лекал) module:

### 1. `/src/app/api/nesting/route.ts`
- **GET**: List all nesting layouts with items, patternPiece, and pattern relations. Parses JSON `points`/`notches` fields on PatternPiece.
- **POST**: Create new nesting layout with optional items. Validates with `CreateNestingLayoutSchema`. Handles P2003 foreign key errors.

### 2. `/src/app/api/nesting/[id]/route.ts`
- **GET**: Single nesting layout with items + patternPiece + pattern. Parses JSON fields.
- **PATCH**: Update layout including full items replacement (delete-then-create pattern). Validates with `UpdateNestingLayoutSchema`. Handles P2025 (not found) and P2003 (FK violation).
- **DELETE**: Delete layout (cascades items via Prisma schema). Handles P2025.

### 3. `/src/app/api/nesting/[id]/auto-arrange/route.ts`
- **POST**: Implements bottom-left-fill automatic nesting algorithm:
  1. Fetches layout with pattern and pieces
  2. Validates layout has a pattern with pieces
  3. Sorts pieces by height (tallest first), then width (widest first)
  4. Expands pieces by their `quantity` field
  5. For each piece instance, tries 4 orientations: (0°, normal), (180°, normal), (0°, flipped), (180°, flipped)
  6. Finds the lowest Y, then leftmost X position that doesn't overlap with placed pieces
  7. Uses candidate position generation from occupied rectangle edges
  8. Calculates `fabricLength` as max(Y + pieceHeight) across all placed items
  9. Calculates `utilization` as (totalPieceArea / totalFabricArea) * 100, rounded to 2 decimals
  10. Uses a transaction to delete old items, create new items, and update layout (fabricLength, utilization, status='arranged')

## Auth
All routes use `withAuth(handler, ['supervisor', 'cutter'])`

## Key Design Decisions
- JSON fields (points, notches) are parsed from strings when reading from DB
- Items are replaced entirely on PATCH (delete-then-create in the same update)
- Auto-arrange uses a transaction for atomicity
- Pre-existing lint/TS errors are in other files (download/refactored/, carousel.tsx, etc.) — no errors in nesting files
