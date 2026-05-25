# Задача: Исправление критических проблем и рефакторинг платформы швейного производства

## ВАЖНО: Правила работы с кодом

1. **НЕ меняй файлы, которые не указаны в задаче.** Если нужно изменить файл не из списка — сначала спроси.
2. **НЕ меняй UI/дизайн существующих страниц.** Только логика и безопасность.
3. **После каждого этапа проверяй, что приложение собирается** (`npm run build` без ошибок).
4. **НЕ добавляй новые зависимости** без явного разрешения.
5. **Удали `ignoreBuildErrors: true`** из next.config.ts перед финальной сборкой и исправь все TS-ошибки.

---

## ЭТАП 1: Безопасность авторизации (КРИТИЧНО)

### 1.1. Хэширование паролей

**Файлы:** `src/app/api/auth/login/route.ts`, `src/app/api/seed/route.ts`, `src/app/api/employees/route.ts`, `src/app/api/employees/[id]/route.ts`

**Что сделать:**
- Установи `bcryptjs` (и `@types/bcryptjs` в devDependencies)
- При создании сотрудника (seed, POST /api/employees) — хэшируй пароль через `bcrypt.hash(password, 10)`
- При логине (POST /api/auth/login) — проверяй через `bcrypt.compare(password, employee.password)`
- При изменении пароля сотрудника (PATCH /api/employees/[id]) — если передан новый пароль, хэшируй его

### 1.2. Безопасная сессия

**Файлы:** `src/app/api/auth/login/route.ts`, `src/app/api/auth/me/route.ts`, `src/app/api/auth/logout/route.ts`

**Что сделать:**
- Замени base64-токен на JWT. Установи `jose` (легковесная библиотека для JWT)
- Создай файл `src/lib/session.ts` с функциями:
  - `createSessionToken(payload: {id, name, role, code}): string` — подписывает JWT с секретом из `process.env.JWT_SECRET`
  - `verifySessionToken(token: string): payload | null` — проверяет подпись
- В login: создавай JWT-токен через `createSessionToken`
- В /api/auth/me: проверяй токен через `verifySessionToken`
- В cookie: поставь `httpOnly: true` (сейчас `false`!)
- Добавь в `.env`: `JWT_SECRET=замените-на-случайную-строку-32символа`

### 1.3. Middleware для проверки авторизации

**Создать файл:** `src/middleware.ts`

**Что сделать:**
- Создай Next.js middleware, который:
  - Пропускает без проверки: `/api/auth/login`, `/api/auth/me`, `/login`, `_next/`, статические файлы
  - Для всех остальных `/api/*` — проверяет JWT-токен из cookie. Если невалиден — возвращает 401
  - Для защищённых страниц (`/production`, `/`) — если нет валидной сессии, редирект на `/login`
- Добавь проверку роли для критичных операций:
  - Создание/удаление сотрудников — только `supervisor`
  - Утверждение планов — только `supervisor`
  - Seed-эндпоинт — только `supervisor`

### 1.4. Защита seed-эндпоинта

**Файл:** `src/app/api/seed/route.ts`

**Что сделать:**
- Добавь проверку: эндпоинт работает ТОЛЬКО если в запросе есть заголовок `X-Admin-Key` совпадающий с `process.env.ADMIN_SECRET_KEY`
- Добавь в `.env`: `ADMIN_SECRET_KEY=замените-на-другой-случайный-ключ`
- Или проще: удали этот эндпоинт целиком и сделай seed через Prisma-скрипт (`prisma/seed.ts`), который запускается только из консоли

### 1.5. Убрать пароль из ответов API

**Файлы:** `src/app/api/employees/route.ts`, `src/app/api/employees/[id]/route.ts`

**Что сделать:**
- Во всех ответах (GET, POST, PATCH) исключай поле `password` через Prisma `select` или `omit`
- Пример: вместо `db.employee.findMany()` → `db.employee.findMany({ select: { id: true, name: true, code: true, username: true, role: true } })`
- Также убери поле `password` из интерфейса `Employee` в `production-tabs.tsx` (строка ~5778)

---

## ЭТАП 2: Вынести типы и разбить монолит

### 2.1. Единый файл типов

**Создать файл:** `src/types/index.ts`

**Что сделать:**
- Перенеси ВСЕ интерфейсы из `page.tsx` и `production-tabs.tsx` в этот файл:
  - `Employee`, `Product`, `ProductSize`, `ProductColor`, `ReworkReason`, `Rework`
  - `TaskWithRelations`, `Stats`
  - `Plan`, `PlanItem`, `CuttingPlan`, `CuttingPlanItem`
  - `SewingTask`, `SewingTaskItem`, `SewingTaskBrief`
  - `SellerPlan`, `SellerPlanItem`, `SellerPlanCity`
  - `Box`, `BoxItem`, `BoxType`, `BoxTypeCapacity`
  - `City`
- Удали дубликаты — оставь один интерфейс на каждый тип
- В `page.tsx` и `production-tabs.tsx` замени локальные интерфейсы на `import { ... } from '@/types'`

### 2.2. Разбить page.tsx на компоненты

**Создать файлы:**
- `src/components/tabs/sewer-tab.tsx` — вкладка "Швея"
- `src/components/tabs/qc-tab.tsx` — вкладка "ОТК"
- `src/components/tabs/supervisor-tab.tsx` — вкладка "Руководитель" (сейчас это весь блок после Tabs в page.tsx)

**Что сделать:**
- Вынеси каждый компонент-вкладку в отдельный файл
- В `page.tsx` оставь только: импорты, компонент-обёртку с Tabs + авторедирект
- Хелперы `getStatusBadge`, `getReworkStatusBadge`, `getColorDot`, `getRoleLabel` перенеси в `src/lib/helpers.tsx`

---

## ЭТАП 3: Валидация API

### 3.1. Zod-схемы для API

**Создать файл:** `src/lib/validations.ts`

**Что сделать:**
- Создай zod-схемы для всех входящих данных API:
  - `loginSchema` — `{ username: z.string().min(1), password: z.string().min(1) }`
  - `createProductSchema` — `{ name: z.string().min(1), article: z.string().min(1), sewerRate: z.number().min(0), ... }`
  - `createTaskSchema` — `{ employeeId: z.string(), productId: z.string(), quantity: z.number().int().min(1), ... }`
  - `createReworkSchema` — `{ taskId: z.string(), quantity: z.number().int().min(1), reason: z.string().min(1) }`
  - `updateBoxSchema` — `{ status: z.enum([...]).optional(), items: z.array(...).optional() }`
  - и т.д. для каждого эндпоинта
- В каждом API route добавь валидацию:
  ```
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Неверные данные', details: result.error.flatten() }, { status: 400 })
  }
  const data = result.data
  ```

---

## ЭТАП 4: Исправление бизнес-логики коробов

### 4.1. Реальное распределение по коробам с лимитом

**Файл:** `src/app/api/boxes/route.ts`

**Что сделать:**
- Замени текущую логику (1 короб на город) на алгоритм с учётом `BoxCapacity`:
  1. Получи тип короба по умолчанию (первый из `BoxType`) или используй переданный `boxTypeId`
  2. Для каждого города:
     - Отсортируй позиции: артикул → цвет → размер
     - Создай короб, наполняй позиции по одной
     - Для каждой позиции проверяй `BoxCapacity.maxQty` для данного размера изделия
     - Если текущий короб заполнен (позиция не помещается) — создай новый короб с `boxNumber + 1`
  3. Логика заполнения:
     - Позиции с одинаковым артикул+размер+цвет группируются
     - Если количество позиции > maxQty — разбей на несколько BoxItem'ов в разных коробах
     - Короб считается заполненным, когда ЛЮБАЯ следующая позиция не помещается по лимиту
  4. Каждый короб получает статус `forming`

**Пример алгоритма:**
```
for each city:
  sort items by article, color, size
  currentBox = create box(boxNumber=1, city, sellerPlanId)
  for each item in sortedItems:
    capacity = BoxCapacity where boxTypeId=currentBox.boxTypeId AND productId=item.productId AND size=item.size
    maxPerBox = capacity?.maxQty ?? 30  // дефолт 30 если не задано
    remaining = item.quantity
    while remaining > 0:
      alreadyInBox = currentBox.items.filter(same article+size+color).sum(plannedQty)
      canFit = maxPerBox - alreadyInBox
      if canFit <= 0:
        currentBox = create box(boxNumber++, city, sellerPlanId)
        canFit = maxPerBox
      qtyForThisBox = min(remaining, canFit)
      add BoxItem to currentBox with plannedQty=qtyForThisBox
      remaining -= qtyForThisBox
      if remaining > 0:
        currentBox = create box(boxNumber++, city, sellerPlanId)
```

---

## ЭТАП 5: Конфигурация

### 5.1. Next.config.ts

**Файл:** `next.config.ts`

**Что сделать:**
- Удали `ignoreBuildErrors: true`
- Исправь все TypeScript-ошибки, которые появятся
- Убедись, что `npm run build` проходит без ошибок

### 5.2. Удалить неиспользуемые зависимости

**Файл:** `package.json`

**Что сделать:**
- Удали `next-auth` из dependencies (не используется, своя авторизация)
- Удали `@mdxeditor/editor` если не используется
- Удали `react-syntax-highlighter` если не используется
- Удали `z-ai-web-dev-sdk` если не используется
- Запусти `npm install` после удаления

---

## Порядок выполнения

1. Сначала Этап 1 (безопасность) — это критично
2. Потом Этап 5.1 (убрать ignoreBuildErrors и исправить TS-ошибки)
3. Потом Этап 2 (рефакторинг типов и компонентов)
4. Потом Этап 3 (валидация)
5. Потом Этап 4 (короба)
6. В конце Этап 5.2 (зависимости)

**После КАЖДОГО этапа:**
- Запусти `npm run build` — должно пройти без ошибок
- Проверь, что логин работает (POST /api/auth/login)
- Проверь, что API отдаёт данные (GET /api/products)

---

## Файлы, которые МОЖНО менять

- `src/lib/session.ts` (создать)
- `src/lib/validations.ts` (создать)
- `src/lib/helpers.tsx` (создать)
- `src/types/index.ts` (создать)
- `src/middleware.ts` (создать)
- `src/components/tabs/sewer-tab.tsx` (создать)
- `src/components/tabs/qc-tab.tsx` (создать)
- `src/components/tabs/supervisor-tab.tsx` (создать)
- `src/app/api/auth/login/route.ts`
- `src/app/api/auth/me/route.ts`
- `src/app/api/auth/logout/route.ts`
- `src/app/api/seed/route.ts`
- `src/app/api/employees/route.ts`
- `src/app/api/employees/[id]/route.ts`
- `src/app/api/products/route.ts`
- `src/app/api/products/[id]/route.ts`
- `src/app/api/tasks/route.ts`
- `src/app/api/tasks/[id]/route.ts`
- `src/app/api/reworks/route.ts`
- `src/app/api/reworks/[id]/route.ts`
- `src/app/api/plans/route.ts`
- `src/app/api/plans/[id]/route.ts`
- `src/app/api/cutting-plans/route.ts`
- `src/app/api/cutting-plans/[id]/route.ts`
- `src/app/api/sewing-tasks/route.ts`
- `src/app/api/sewing-tasks/[id]/route.ts`
- `src/app/api/seller-plans/route.ts`
- `src/app/api/seller-plans/[id]/route.ts`
- `src/app/api/boxes/route.ts`
- `src/app/api/boxes/[id]/route.ts`
- `src/app/page.tsx`
- `src/components/production-tabs.tsx`
- `next.config.ts`
- `package.json`
- `.env`

## Файлы, которые НЕЛЬЗЯ менять

- `prisma/schema.prisma` (не трогать структуру БД)
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/components/ui/*` (shadcn компоненты)
- `src/components/auth-provider.tsx` (можно только если сломалось из-за JWT)
- `src/components/providers.tsx`
- `src/app/login/page.tsx` (можно только если сломалось из-за JWT)
