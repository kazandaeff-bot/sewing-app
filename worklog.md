---
Task ID: 1
Agent: Main Agent
Task: Fix items not appearing in QC after sewing, add partial submission support

Work Log:
- Investigated root cause: QCTab reads from old `Task` model via `/api/tasks`, but SewerTab writes to new `SewingTask` model via `/api/sewing-tasks` — two completely disconnected data models
- Updated Prisma schema: added `SewingRework` model with relations to `SewingTask` and `SewingTaskItem`
- Added `reworks` relation to both `SewingTask` and `SewingTaskItem` models
- Applied schema migration with `prisma db push`
- Rewrote PATCH `/api/sewing-tasks/[id]` to support `submitToQc` parameter for partial submission:
  - Full submit: sets status to `pending_qc` (existing behavior)
  - Partial submit: creates new SewingTask with `pending_qc` status with sent items, reduces original task item quantities, deletes items with 0 remaining
- Created `/api/sewing-reworks` and `/api/sewing-reworks/[id]` API routes for new rework model
- Updated `/api/sewing-tasks` GET to include `reworks` and item `reworks` in response
- Rewrote QCTab (page.tsx) to read from `/api/sewing-tasks?status=pending_qc` and `/api/sewing-tasks?status=completed`
- Rewrote QCTab to use `/api/sewing-reworks` for rework operations
- Added types: `SewingTaskResponse`, `SewingTaskItemResponse`, `SewingReworkResponse`
- Modified SewerTab "Отшить" dialog: added partial submission mode with `isPartialSubmit` toggle, `sendQty` per item, two submit buttons
- Modified `handleComplete` to accept `partial: boolean` parameter
- Handled legacy `done` status in SewerTab task grouping
- Added graceful shutdown handlers to db.ts
- Created watchdog.sh to auto-restart standalone server
- Tested all scenarios: GET pending_qc (5 tasks visible), PATCH accept (status→completed), partial submit (3 of 5 → new task pending_qc, 2 remain in_work)

Stage Summary:
- Main bug fixed: QC now sees items submitted by sewers (was reading wrong table)
- Partial submission feature implemented: sewer can send part of items to QC, rest stays in work
- New SewingRework model and API for rework tracking within SewingTask workflow
- Standalone server crashes after PATCH requests — mitigated with watchdog auto-restart
