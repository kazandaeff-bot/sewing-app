# Task 4: Plan Editing Functionality

## Summary
Added plan editing functionality to the SewingPlansTab component and updated the PATCH API endpoint to sync cutting plans when approved plans are edited.

## Files Modified

### 1. `/home/z/my-project/src/components/production-tabs.tsx`
- **Added `AlertTriangle` import** from lucide-react
- **Added edit dialog state variables**: `editDialogOpen`, `editingPlanId`, `editingPlanName`, `editingPlanStatus`, `editPlanItems`
- **Added `updatePlanItemsMutation`**: Mutation for PATCH requests with items data, invalidates both plans and cutting-plans queries on success
- **Added edit helper functions**:
  - `openEditPlan(plan)` - Opens edit dialog pre-filled with plan's current items
  - `addEditPlanItemRow()` - Adds a new empty item row
  - `removeEditPlanItemRow(index)` - Removes item row (disabled for existing items in approved plans)
  - `updateEditPlanItem(index, field, value)` - Updates a specific field
  - `handleEditProductChange(index, productId)` - Handles product selection change, resets size/color
  - `handleEditColorSelect(index, colorValue, selectedProduct)` - Handles color selection with kit combo support
  - `handleSaveEditPlan()` - Validates and submits the edit
- **Added "Изменить" (Edit) button** for both `draft` and `approved` status plans
- **Added Edit Plan Dialog** with:
  - Warning banner for approved plans explaining restrictions
  - Plan name editing
  - Item rows with product/size/color/hex/quantity fields
  - For approved plans: existing items have disabled product/size/color/hex fields, quantity min set to current value, remove button disabled
  - New items can be freely added regardless of plan status

### 2. `/home/z/my-project/src/app/api/plans/[id]/route.ts`
- **Added cutting plan sync logic** in the PATCH handler after regular update
- When plan status is `approved` and items are provided:
  - Finds the associated cutting plan
  - Rebuilds cutting plan items from the updated plan items (with kit expansion logic)
  - Sums items by productId + size + color
  - Deletes old cutting plan items and recreates with new data

## Behavior
- **Draft plans**: Full editing - add/remove items, change quantities, add new positions
- **Approved plans**: Only allow increasing quantities and adding new positions (existing items' product/size/color are disabled, quantity has min=current, remove is disabled)
- **Cutting plan sync**: When an approved plan is edited, the cutting plan is automatically updated to reflect the changes
