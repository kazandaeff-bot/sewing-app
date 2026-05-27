# Task 5: Customer Model Implementation

## Summary
Successfully implemented the Customer (Заказчик) model with customer-specific product catalogs and custom parameters.

## Changes Made

### 1. Prisma Schema (`prisma/schema.prisma`)
- Added `Customer` model with fields: id, name (unique), contactInfo, timestamps
- Added `CustomerProduct` model with fields: id, customerId, productId, customBoxCapacity, customWeight, customDimensions, customWidth, customHeight
- Added `customerId` field to `Employee` model (optional, with Customer relation)
- Added `customerProducts` relation to `Product` model
- Added `customerId` field to `Plan` model (optional, with Customer relation)
- Added `customerId` field to `SellerPlan` model (optional, with Customer relation)

### 2. Database Migration
- Ran `npx prisma db push` successfully to sync schema changes

### 3. API Routes
- Created `/api/customers/route.ts`:
  - GET: List all customers with products and employee count
  - POST: Create new customer (with unique name validation)
- Created `/api/customers/[id]/route.ts`:
  - GET: Get single customer with products and employees
  - PATCH: Update customer (name, contactInfo, addProducts, removeProducts, updateProducts)
  - DELETE: Delete customer (cascade deletes customerProducts)

### 4. Employee API Updates
- Updated `/api/employees/route.ts`:
  - GET now includes `customer` relation
  - POST now accepts `customerId` field
- Updated `/api/employees/[id]/route.ts`:
  - PATCH now accepts `customerId` field

### 5. UI Changes (`src/components/production-tabs.tsx`)
- Added `Store`, `ChevronDown`, `ChevronUp` icons from lucide-react
- Added `customerId` and `customer` to `Employee` interface
- Added `{ value: 'customer', label: 'Заказчик' }` to EMPLOYEE_ROLES
- Added customer state variables: customerDialogOpen, editingCustomer, customerForm, customerProducts, expandedCustomerId
- Added customers query with key `['customers']`
- Added customer mutations: create, update, delete
- Added customer dialog helpers: openCreateCustomer, openEditCustomer, closeCustomerDialog, addCustomerProductRow, removeCustomerProductRow, updateCustomerProduct, handleSaveCustomer
- Added "Заказчики" section in ReferencesTab after "Типы коробов" section, featuring:
  - Expandable customer list with name, contact info, product count, employee count
  - Add/Edit/Delete buttons for each customer
  - Customer dialog with name, contact info, and product assignment section with custom params (box capacity, weight, dimensions, width, height)
  - Expandable product catalog under each customer
- Added Customer select field in Employee dialog when role is 'customer'
- Updated employeeForm state to include customerId
- Updated handleSaveEmployee to pass customerId

## API Endpoints Verified
- GET /api/customers → returns customers with products and counts
- POST /api/customers → creates customer (201 response)
- PATCH /api/customers/[id] → updates customer with product management
- DELETE /api/customers/[id] → deletes customer
- All endpoints working correctly as verified via curl

## Lint
- ESLint passes with no errors
