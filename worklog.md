---
Task ID: 1
Agent: main
Task: Сортировка размеров по каноническому порядку

Work Log:
- Added SIZE_ORDER constant with canonical order (XXS→XS→S→M→L→XL→XXL→2XL→3XL→...→42→44→...→64→ONE SIZE)
- Added SIZE_ORDER_MAP and sortSizes() helper function
- Applied sortSizes in applySizeGrid, addProductSize callbacks
- Updated product sizes display in tables to sort by SIZE_ORDER_MAP

Stage Summary:
- Sizes now sort correctly: XXS appears before XS, not after XXL
- Unknown sizes fall back to numeric-aware alphabetical sort

---
Task ID: 2
Agent: main
Task: Добавить удаление размеров и цветов из размерной линейки

Work Log:
- Enhanced X buttons on size/color badges (larger h-3.5, red hover bg, accessible titles)
- Added "Очистить все" (Clear All) buttons for sizes and colors
- Improved placeholder text for empty states

Stage Summary:
- Size and color deletion UX significantly improved
- Clear All button allows quick reset of size grid

---
Task ID: 3
Agent: main
Task: Убрать дублирование изделий

Work Log:
- Removed "Изделия" tab trigger and TabsContent from supervisor's tab bar
- Removed entire ProductsTab function (~260 lines)
- Cleaned up 10 unused imports
- Products now managed exclusively through Справочники tab

Stage Summary:
- No more confusion between two product management interfaces
- Supervisor tabs: Планы→Раскрой→Задания→Швеи→ОТК→Города→Короба→Сотрудники→Справочники

---
Task ID: 4
Agent: main
Task: Редактирование плана

Work Log:
- Added edit dialog with pre-filled plan items
- Draft plans: full editing freedom
- Approved plans: warning banner, only quantity increase and new positions allowed
- Existing items in approved plans have disabled product/size/color/hex fields
- Added cutting plan sync: when approved plan items change, cutting plan is rebuilt

Stage Summary:
- Plans can now be edited after creation
- Business rules enforced: approved plans have restrictions
- Cutting plan stays in sync with plan changes

---
Task ID: 5
Agent: main
Task: Модель Заказчик + каталог изделий

Work Log:
- Added Customer and CustomerProduct models to Prisma schema
- Added customerId to Employee, Plan, SellerPlan models
- Created /api/customers and /api/customers/[id] routes
- Updated /api/employees to handle customerId
- Added "Заказчики" section to ReferencesTab with full CRUD
- Added customer role to EMPLOYEE_ROLES with customer select field

Stage Summary:
- Customer model with product catalog and custom params (box capacity, weight, dimensions)
- Customer CRUD in References tab
- Employee-Customer linking for role-based access

---
Task ID: 6
Agent: main
Task: Роль customer + доступы

Work Log:
- Added customerId to auth session and User interface
- Updated /api/auth/login to include customerId
- Added customerId filtering to /api/plans, /api/seller-plans, /api/boxes
- Created CustomerProductsTab (shows products without rates)
- Added customer dashboard with 4 tabs: Мой план, Города, Короба, Мои изделия
- Updated SewingPlansTab, CityDistributionTab, BoxesTab to accept customerId prop

Stage Summary:
- Customer role has restricted dashboard
- Customers see only their own plans, distributions, boxes
- Products displayed without rates (sewerRate, qcRate, reworkRate)

---
Task ID: 7
Agent: main
Task: Учёт материалов

Work Log:
- Added MaterialType, Material, MaterialEntry, MaterialNorm models to Prisma
- Created 8 API endpoints (material-types, materials, material-entries, material-norms)
- Implemented auto-calculation: when consumed entry linked to cutting plan is created,
  system calculates average consumption per unit and upserts MaterialNorm
- Added Materials section to ReferencesTab with types, stock, entry history, norms

Stage Summary:
- Full materials inventory tracking system
- Auto-calculation of average consumption per unit
- Entry history with incoming/consumed types
- Norms per material+product pair

---
Task ID: 8
Agent: main
Task: Заказчик формирует план + распределение по городам

Work Log:
- Created CustomerPlanTab component with unified planning interface
- Two-step UI: plan formation + city distribution
- Real-time "Нераспределено: X шт" indicator per item
- Color-coded status: amber=unallocated, green=fully distributed, red=exceeded
- Updated SellerPlan API to accept customerId
- Replaced SewerTab in customer dashboard with CustomerPlanTab

Stage Summary:
- Customers can create their own plans with city distribution
- Unallocated quantity visibility per item
- One position can be split across multiple cities
- Validation prevents over-allocation
