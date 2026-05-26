# Task 6: Customer Role Implementation

## Summary
Successfully implemented the `customer` role with restricted access in the sewing production app.

## Changes Made

### 1. Auth Login Route (`src/app/api/auth/login/route.ts`)
- Added `customerId` to session data and user response object
- Session token now includes `customerId: employee.customerId || null`
- User response includes `customerId: employee.customerId || null`

### 2. Auth Provider (`src/components/auth-provider.tsx`)
- Added `customerId?: string | null` to the `User` interface

### 3. API Endpoints - customerId Filtering
- **Plans API** (`src/app/api/plans/route.ts`): Added `customerId` query parameter support for GET; includes `customer` relation in response
- **Seller Plans API** (`src/app/api/seller-plans/route.ts`): Added `customerId` query parameter support for GET; includes `customer` relation
- **Boxes API** (`src/app/api/boxes/route.ts`): Added `customerId` query parameter support for GET, filtering via `sellerPlan.customerId`

### 4. Customer Detail API (`src/app/api/customers/[id]/route.ts`)
- Updated product include to also fetch `sizes` and `colors` relations

### 5. Production Tabs (`src/components/production-tabs.tsx`)
- **SewingPlansTab**: Changed signature to accept `customerId` prop; fetches plans filtered by customerId
- **CityDistributionTab**: Changed signature to accept `customerId` prop; fetches seller plans filtered by customerId
- **BoxesTab**: Changed signature to accept `customerId` prop; fetches boxes and seller plans filtered by customerId
- **CustomerProductsTab**: New component that displays customer's products WITHOUT rates (sewerRate, qcRate, reworkRate, homeRate)
- Added `CardDescription` import for the new component

### 6. Main Page (`src/app/page.tsx`)
- Added `Package` icon import from lucide-react
- Added `CustomerProductsTab` import from production-tabs
- Added `customer` case to `getRoleLabel()` returning 'Заказчик'
- Added customer dashboard section AFTER the QC section and BEFORE the supervisor section
- Customer dashboard has 4 tabs: Планы пошива, Города, Короба, Мои изделия

## Build Status
- Lint passes with no errors
- Next.js build succeeds
