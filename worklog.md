---
Task ID: 1
Agent: Main
Task: Fix auth issue - add credentials:'include' to all fetch calls

Work Log:
- Added `credentials: 'include'` to `authFetch()` in auth-provider.tsx
- Added `credentials: 'include'` to all 3 fetch calls in AuthProvider (me, login, logout)
- Added `credentials: 'include'` to all 5 functions in api-client.ts (apiGet, apiPost, apiPatch, apiDelete, apiUpload)
- Added `credentials: 'include'` and auth headers to `printDocument()` in formatters.ts

Stage Summary:
- All frontend fetch calls now include credentials: 'include'
- Bearer token from localStorage is still sent via Authorization header
- Cookie is now also sent as backup auth method

---
Task ID: 2
Agent: Main
Task: Add Manager section (Invoices, UPD, CRM) with database, API, and UI

Work Log:
- Added 6 new Prisma models: Invoice, InvoiceItem, UPD, UPDItem, Deal, DealContact
- Added reverse relations to Customer and Product models
- Ran prisma db push — database schema is in sync
- Added Zod validation schemas for all new entities (Create/Update for Invoice, UPD, Deal, DealContact)
- Created 8 API route files:
  - /api/invoices (GET, POST)
  - /api/invoices/[id] (GET, PATCH, DELETE)
  - /api/upd (GET, POST)
  - /api/upd/[id] (GET, PATCH, DELETE)
  - /api/deals (GET, POST)
  - /api/deals/[id] (GET, PATCH, DELETE)
  - /api/deals/[id]/contacts (GET, POST)
  - /api/deals/[id]/contacts/[contactId] (PATCH, DELETE)
- Created 3 new UI tab components:
  - InvoicesTab (974 lines) — full CRUD for invoices with items, auto-numbering, status tracking
  - UPDTab (1021 lines) — full CRUD for УПД, generate from shipment feature
  - CRMTab (1182 lines) — deal tracking with contacts/meetings, status pipeline, card layout
- Updated page.tsx sidebar:
  - Added "Менеджер" group with 3 items: Счета, УПД, Сделки
  - Added new icons: Receipt, FileSpreadsheet, Handshake
  - Added route cases for new tabs
- Build passes successfully (next build)

Stage Summary:
- Manager section fully implemented with 3 subsections
- Invoices: create/edit/delete invoices with items, auto-calculate totals and VAT, status workflow
- UPD: create/edit/delete УПД, generate from shipment data, link to invoices
- CRM: deal tracking with negotiation status pipeline, meeting/call log, results and next steps
- All APIs require supervisor role
- All UI in Russian, emerald-600 accent color
