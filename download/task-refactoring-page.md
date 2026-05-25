# Задача: Доработка — разбить page.tsx и убрать дублирование типов

## ВАЖНО: Правила работы с кодом

1. **НЕ меняй файлы, которые не указаны в задаче.**
2. **НЕ меняй UI/дизайн.** Только структура файлов и импорты.
3. **После каждого шага проверяй, что `npm run build` проходит без ошибок.**
4. **НЕ добавляй новые зависимости.**
5. **Проверяй, что приложение работает:** логин, вкладки Швея/ОТК/Руководитель.

---

## ЭТАП 1: Убрать дублирование типов в page.tsx

**Файл:** `src/app/page.tsx`

**Проблема:** В page.tsx (строки ~3840-3960) определены локальные интерфейсы, которые дублируют `src/types/index.ts`:
- `Employee`
- `ReworkReason`
- `ProductSize`
- `ProductColor`
- `Product`
- `Rework`
- `TaskWithRelations`
- `Stats`
- `City`
- `BoxTypeCapacity`
- `BoxType`

**Что сделать:**
1. Удали ВСЕ локальные интерфейсы из `page.tsx`
2. Добавь импорт из типов: `import type { Employee, Product, TaskWithRelations, ... } from '@/types'`
3. Импортируй ТОЛЬКО те типы, которые реально используются в page.tsx
4. Убедись, что типы в `src/types/index.ts` покрывают все нужные поля. Если чего-то не хватает — добавь в `src/types/index.ts`, а не в page.tsx

---

## ЭТАП 2: Вынести вкладку "Швея" в отдельный файл

**Создать файл:** `src/components/tabs/sewer-tab.tsx`

**Что сделать:**
1. Найди в `page.tsx` функцию `SewerTab` (начинается с `function SewerTab`)
2. Перенеси её целиком в `src/components/tabs/sewer-tab.tsx`
3. Добавь `'use client'` наверху файла
4. Добавь все нужные импорты (React, react-query, UI-компоненты, иконки, типы, хелперы)
5. Экспортируй: `export function SewerTab(...)`
6. В `page.tsx` замени функцию на: `import { SewerTab } from '@/components/tabs/sewer-tab'`
7. Убедись, что хелперы `getStatusBadge`, `getColorDot` импортируются из `@/lib/helpers` (если они там есть), а не дублируются

---

## ЭТАП 3: Вынести вкладку "ОТК" в отдельный файл

**Создать файл:** `src/components/tabs/qc-tab.tsx`

**Что сделать:**
1. Найди в `page.tsx` функцию `QCTab`
2. Перенеси её целиком в `src/components/tabs/qc-tab.tsx`
3. `'use client'` наверху
4. Все нужные импорты
5. `export function QCTab(...)`
6. В `page.tsx`: `import { QCTab } from '@/components/tabs/qc-tab'`

---

## ЭТАП 4: Вынести вкладку "Руководитель" в отдельный файл

**Создать файл:** `src/components/tabs/supervisor-tab.tsx`

**Что сделать:**
1. Найди в `page.tsx` функцию `SupervisorTab` (или весь блок вкладки "Руководитель")
2. Перенеси в `src/components/tabs/supervisor-tab.tsx`
3. `'use client'` наверху
4. Все нужные импорты
5. `export function SupervisorTab(...)`
6. В `page.tsx`: `import { SupervisorTab } from '@/components/tabs/supervisor-tab'`

---

## ЭТАП 5: Убрать дублирование хелперов

**Файлы:** `src/app/page.tsx`, `src/components/tabs/*.tsx`, `src/lib/helpers.tsx`

**Что сделать:**
1. Проверь, какие хелпер-функции остались в `page.tsx` после выноса вкладок:
   - `getStatusBadge`
   - `getReworkStatusBadge`
   - `getColorDot`
   - `getRoleLabel`
   - и любые другие
2. Если они УЖЕ есть в `src/lib/helpers.tsx` — удали из page.tsx и используй импорт
3. Если их НЕТ в helpers.tsx — перенеси туда и добавь экспорт
4. Каждая функция должна быть определена ОДИН раз — в `src/lib/helpers.tsx`

---

## ЭТАП 6: Финальная проверка page.tsx

**Файл:** `src/app/page.tsx`

**Что должно остаться в page.tsx после всех этапов:**
- Импорты (React, useAuth, useRouter, Tabs-компоненты, вкладки из tabs/)
- Главный компонент страницы с логикой авторедиректа
- Рендер Tabs с TabsList и TabsContent, который использует импортированные вкладки
- **НЕ более 150-200 строк**

**Проверь:**
1. `npm run build` — без ошибок
2. Логин работает
3. Все 3 вкладки рендерятся (Швея, ОТК, Руководитель)
4. Все кнопки работают (Начать, Отшить, Принять, На переделку)
5. Зарплата считается корректно

---

## Порядок выполнения

1. Этап 1 (убрать дубли типов)
2. Этап 2 (SewerTab)
3. Этап 3 (QCTab)
4. Этап 4 (SupervisorTab)
5. Этап 5 (хелперы)
6. Этап 6 (финальная проверка)

**После КАЖДОГО этапа:**
- `npm run build` без ошибок
- Приложение открывается и работает

---

## Файлы, которые МОЖНО менять

- `src/app/page.tsx`
- `src/components/tabs/sewer-tab.tsx` (создать)
- `src/components/tabs/qc-tab.tsx` (создать)
- `src/components/tabs/supervisor-tab.tsx` (создать)
- `src/lib/helpers.tsx` (добавить недостающие хелперы)
- `src/types/index.ts` (если не хватает полей в типах)

## Файлы, которые НЕЛЬЗЯ менять

- Всё остальное (API routes, middleware, auth, prisma schema, UI-компоненты, production-tabs.tsx)
