# Task 8: Customer Plan Tab with City Distribution

## Summary
Implemented a unified customer planning interface (`CustomerPlanTab`) that allows customers to form their own sewing plans and distribute items by cities, with visibility of unallocated quantity.

## Changes Made

### 1. Updated SellerPlan API (`/api/seller-plans/route.ts`)
- Added `customerId` support to the POST handler
- Plans created by customers are now linked to the customer via `customerId`

### 2. Created CustomerPlanTab Component (`production-tabs.tsx`)
- New `CustomerPlanTab` component that serves as the customer's unified planning interface
- Features:
  - **Existing plans list**: Shows all plans for the customer with expandable details
  - **Plan creation form**: Inline form with items and city distribution
  - **City distribution per item**: Each item can have multiple cities assigned
  - **Unallocated quantity indicator**: Shows `Нераспределено: X шт` for each item
  - **Validation**: Prevents city quantities from exceeding total item quantity
  - **Color-coded status**: Amber for unallocated, green for fully distributed, red for exceeded
  - **Uses City reference**: City dropdowns populated from the cities API
  - **Customer product catalog**: Uses customer's own product catalog if available
  - **Approve/Delete actions**: For draft plans

### 3. Updated Customer Dashboard (`page.tsx`)
- Replaced `SewingPlansTab` with `CustomerPlanTab` in the customer's "plans" tab
- Changed tab label from "Планы пошива" to "Мой план"
- Added `CustomerPlanTab` import

### Key UX Features
- One position can be split across multiple cities
- Real-time unallocated quantity calculation (totalQty - sum of city quantities)
- Warning when city distribution exceeds total quantity
- Expandable existing plans showing city distribution details
- Uses existing SellerPlan/SellerPlanItem/SellerPlanCity data model
