---
id: 018
title: Egresos (gastos operativos)
status: done
module: finance
scope: admin
---

# 018 — Egresos (gastos operativos)

## Objetivo

Un admin con `expenses.view` registra, edita y elimina gastos operativos en `/admin/finanzas/egresos`, y los lista filtrados por categoría y rango de fechas.

## Alcance

Incluye:
- Tabla nueva `expenses` con soft-delete y CRUD auditado (crear, editar, eliminar).
- Listado paginado con filtro por categoría y rango de fechas; permisos `expenses.{view,create,update,delete}`.
- Ítem "Egresos" bajo el grupo "Finanzas" del sidebar (creado en 016).

No incluye:
- **COGS**: el costo de mercadería NO se registra aquí. Se calculará desde `order_items.unit_cost_cents` (016) en el spec de Ganancias. Una compra de inventario no es gasto operativo y no entra como `other`.
- Ingresos, Impuestos, Ganancias ni P&L; tampoco un total sumado del listado: specs posteriores del módulo.
- Adjuntar comprobantes, gastos recurrentes, multimoneda, `updatedBy` y restaurar un egreso eliminado.

## Criterios de aceptación

- [x] AC1 — Dado `expenses.view` cuando abre la página entonces ve fecha, categoría, monto, descripción y quién lo registró, paginado y ordenado por fecha descendente.
- [x] AC2 — Dado el filtro de categoría y/o el rango de fechas cuando cambia entonces el listado vuelve a página 1; `dateTo` anterior a `dateFrom` responde 400.
- [x] AC3 — Dado `expenses.create` cuando guarda entonces persiste con `createdBy` tomado de la sesión (nunca del body) y existe una fila `audit_logs` con `action: "expense.created"`, `entityType: "expense"` y `changes.after`, escrita en la misma transacción.
- [x] AC4 — Dado `expenses.update` cuando edita entonces `audit_logs` registra `expense.updated` con `before`/`after` de categoría, monto, fecha y descripción.
- [x] AC5 — Dado `expenses.delete` cuando elimina entonces la fila queda con `deletedAt`, desaparece del listado, la fila sigue en la tabla y `audit_logs` registra `expense.deleted` con `changes.before`.
- [x] AC6 — Dado un monto `0`, negativo o con más de dos decimales entonces el formulario lo rechaza y el `POST`/`PATCH` responde 400; el monto viaja y se guarda en centavos enteros.
- [x] AC7 — Dado un admin sin el permiso correspondiente entonces no ve el control (crear/editar/eliminar) y el endpoint responde 403; sin `expenses.view` la página redirige y el `GET` responde 403.
- [x] AC8 — Dado el formulario abierto entonces bajo el campo Categoría se lee que las compras de inventario no se registran aquí, porque el costo de mercadería sale de la ficha del producto.
- [x] AC9 — Estados de carga, vacío y error con reintento en la tabla.

## Datos

Requiere migración: `npm run db:generate` + `db:migrate` + `db:seed`.

Tabla nueva `expenses` · `src/server/db/schema/expense.ts`:
| Columna                      | Tipo                        | Constraint                                                                |
| ---------------------------- | --------------------------- | ------------------------------------------------------------------------- |
| `id`                         | `uuid`                      | pk `defaultRandom()`                                                      |
| `category`                   | `expense_category` (pgEnum) | notNull · `shipping`, `marketing`, `payroll`, `payment_fees`, `other`      |
| `amount_cents`               | `integer`                   | notNull · check `expenses_amount_cents_check`: `amount_cents > 0`         |
| `expense_date`              | `date` (`mode: "string"`)   | notNull                                                                   |
| `description`                | `text`                      | nullable                                                                  |
| `created_by`                 | `uuid`                      | notNull · `references(users.id, { onDelete: "restrict" })`                |
| `deleted_at`                 | `timestamptz`               | nullable — soft-delete, mismo patrón que `categories`/`products`          |
| `created_at` / `updated_at`  | `timestamptz`               | notNull `defaultNow()`; `updated_at` con `$onUpdate`                      |

`expense_date` es `date` y no `timestamptz`: es un día de calendario, así no hay deriva de zona y encaja 1:1 con `<input type="date">`. Es la primera columna `date` del proyecto, así que **no** se reusa `dayBoundary` de auditoría.
Índices, ambos `where deleted_at is null`: `expenses_expense_date_idx` on (`expense_date` desc, `created_at` desc) y `expenses_category_expense_date_idx`.
Cuatro `PermissionSeed` con `resource: "expenses"`. `super_admin` y `admin` los reciben por su grant `kind: "all"`; las listas de `manager`, `employee` y `audit` no se tocan.

## API

| Método | Ruta                                  | Auth              | Body                  | Response                                 |
| ------ | ------------------------------------- | ----------------- | --------------------- | ---------------------------------------- |
| GET    | `/api/admin/finance/expenses`         | `expenses.view`   | —                     | `{ data: ExpenseRow[], meta: PageMeta }` |
| POST   | `/api/admin/finance/expenses`         | `expenses.create` | `createExpenseSchema` | `ExpenseRow` 201                         |
| PATCH  | `/api/admin/finance/expenses/[id]`    | `expenses.update` | `updateExpenseSchema` | `ExpenseRow` · 404                       |
| DELETE | `/api/admin/finance/expenses/[id]`    | `expenses.delete` | —                     | 204 · 404                                |

`ExpenseRow`: `id`, `category`, `amountCents`, `expenseDate` ("YYYY-MM-DD"), `description: string | null`, `createdByName: string | null`, `createdAt`. Sin `createdBy` crudo y sin `deletedAt` en el cable.

Zod · `src/modules/finance/schemas/expense.schema.ts`:
- `expenseQuerySchema` — `productQuerySchema.pick({ page: true, pageSize: true })` extendido con `category?` (`z.enum`), `dateFrom?`/`dateTo?` (`z.iso.date()`) y refine `dateFrom <= dateTo`.
- `createExpenseSchema` — `category`, `amountCents` (`centsSchema("El monto").min(1, …)`), `expenseDate` (`z.iso.date()`), `description` (`z.string().trim().min(1).max(280).nullable()`; el formulario manda `null` con el campo vacío, igual que `updateCostFormSchema`). Sin `createdBy`.
- `updateExpenseSchema` — `createExpenseSchema.partial()` con refine de al menos un campo presente: ausente = no tocar, `null` = borrar la descripción, string = fijarla.
- `expenseFormSchema` — el monto se captura en soles con `amountInputSchema("El monto")`.

## Reutilizar

- `src/app/api/admin/finance/unit-price/[id]/route.ts` — molde del handler auditado: `requirePermission` → Zod → `getDb().transaction(repo + logAudit)` → `switch` del resultado discriminado fuera de la tx.
- `src/server/repositories/category.repository.ts` (`alive()` = `isNull(deletedAt)`, `create`, `update`, `softDelete` con `.returning()`) — molde del repositorio con soft-delete. Aquí las mutaciones además reciben `tx`.
- `src/modules/categories/components/{category-form,category-form-dialog,delete-category-dialog}.tsx` — molde de CRUD con React Hook Form y confirmación con `alert-dialog`.
- `src/modules/finance/components/unit-price-{view,table,columns,toolbar}.tsx` — pantalla vigente de Finanzas: paginación manual, `keepPreviousData`, skeleton/vacío/error con reintento.
- `src/modules/finance/{constants.ts,types,schemas,services,hooks}` — el módulo ya existe: se añaden archivos, no se crea infraestructura nueva.
- `src/modules/products/schemas/product.schema.ts` (`centsSchema`, `amountInputSchema`, `productQuerySchema`), `src/modules/products/constants.ts` (`DEFAULT_PAGE_SIZE`, `PAGE_SIZE_OPTIONS`) y `src/lib/format.ts` (`formatCents`, `centsToAmountInput`, `toCents`, `formatCustomerName(parts, fallback)` para `createdByName`), `src/lib/{audit,permissions,api-error,axios}.ts`, `src/lib/auth.ts` (`getCurrentAppUser`) y `src/types/api.ts` (`PageMeta`).
- `src/modules/audit/constants.ts` — `ALL_FILTER_VALUE` es el centinela del `Select` de categoría (Radix no admite `value=""`): no se añade un tercer centinela.
- `src/components/ui/` — `table`, `dialog`, `alert-dialog`, `select`, `input`, `textarea`, `field`, `label`, `button`, `badge`, `skeleton` ya instalados: nada que añadir con `npx shadcn@latest add`.
- `src/proxy.ts` — **sin cambios**. Tres capas: sesión en el proxy, verificación por código de permiso en `page.tsx` (redirect) y en cada handler.

## Tareas

Etapas: T1–T13 y T26 (datos/backend) · T14–T25 (UI).
- [x] T1 — `expenseCategory` pgEnum + tabla `expenses` con su check e índices · `src/server/db/schema/expense.ts`
- [x] T2 — Re-export en el barrel · `src/server/db/schema/index.ts`
- [x] T3 — Generar y aplicar la migración · `drizzle/` (generada `0006_cheerful_robbie_robertson.sql`; `db:migrate` pendiente, lo corre la sesión principal)
- [x] T4 — Cuatro `PermissionSeed` de `expenses` y correr `db:seed` · `src/server/db/seed.ts`
- [x] T5 — `EXPENSES_VIEW/CREATE/UPDATE/DELETE` en `PERMISSIONS` · `src/lib/permissions.ts`
- [x] T6 — `list` (filtros, join a `users` para `createdByName`, orden `expense_date desc, created_at desc`) y `findById`, que devuelve esa misma fila unida · `src/server/repositories/expense.repository.ts`
- [x] T7 — `create(data, tx)`, `update(id, data, tx)` y `softDelete(id, tx)`; los dos últimos bloquean la fila con `.for("update")` y devuelven `{ kind: "ok"; before; after } | { kind: "not_found" }` · idem
- [x] T8 — `it.todo` de los cinco métodos con la nota `server-only` del archivo · `src/server/repositories/expense.repository.test.ts`
- [x] T9 — `ExpenseCategory` derivado del pgEnum con `import type`, `ExpenseRow` y `ExpenseListResponse` · `src/modules/finance/types/expense.ts`
- [x] T10 — `EXPENSE_CATEGORY_VALUES` (`as const satisfies readonly ExpenseCategory[]`), `EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string>`, sus `OPTIONS` y `expenseKeys` · `src/modules/finance/constants.ts`
- [x] T11 — Los cuatro schemas Zod · `src/modules/finance/schemas/expense.schema.ts`
- [x] T12 — `GET` (query + proyección a `ExpenseRow`) y `POST` auditado (`createdBy` de `getCurrentAppUser()`; `ForbiddenError` si es `null`, porque el helper es nullable y la columna no; `createdByName` con `formatCustomerName(actor, null)`, sin re-leer tras el commit) · `src/app/api/admin/finance/expenses/route.ts`
- [x] T13 — `PATCH` y `DELETE` auditados: `expense.updated` con `before`/`after` de los cuatro campos editables, `expense.deleted` solo con `before`, `kind: "not_found"` → 404; el `createdByName` de la respuesta sale del `findById` previo a la tx (`createdBy` es inmutable) · `src/app/api/admin/finance/expenses/[id]/route.ts`
- [x] T14 — Service axios (list/create/update/remove) + test · `src/modules/finance/services/expense.service.ts`
- [x] T15 — `useExpenses` con `keepPreviousData` · `src/modules/finance/hooks/use-expenses.ts`
- [x] T16 — `useCreateExpense`/`useUpdateExpense`/`useDeleteExpense`, invalidan `expenseKeys.lists()` · `src/modules/finance/hooks/use-expense-mutations.ts`
- [x] T17 — Columnas: fecha en formato local, `formatCents`, etiqueta de categoría y acciones según permisos · `src/modules/finance/components/expenses-columns.tsx`
- [x] T18 — Tabla con paginación manual, skeleton, vacío y error con reintento · `src/modules/finance/components/expenses-table.tsx`
- [x] T19 — Toolbar: `Select` de categoría con `ALL_FILTER_VALUE` y `dateFrom`/`dateTo` con `min`/`max` cruzados · `src/modules/finance/components/expenses-toolbar.tsx`
- [x] T20 — Formulario RHF con la nota de AC8 bajo Categoría · `src/modules/finance/components/expense-form.tsx`
- [x] T21 — Diálogo crear/editar que monta el formulario y avisa con `toast` · `src/modules/finance/components/expense-form-dialog.tsx`
- [x] T22 — Confirmación de borrado con `alert-dialog` · `src/modules/finance/components/delete-expense-dialog.tsx`
- [x] T23 — Vista cliente: estado de filtros, reset a página 1 y orquestación de los diálogos · `src/modules/finance/components/expenses-view.tsx`
- [x] T24 — Página Server Component con gate `expenses.view` (redirect) y props `canCreate`/`canUpdate`/`canDelete` · `src/app/(admin)/admin/finanzas/egresos/page.tsx`
- [x] T25 — Ítem "Egresos" (`expenses.view`, `section: "Finanzas"`) **inmediatamente después** del de precio unitario: `groupBySection` solo agrupa tramos consecutivos y un ítem suelto duplicaría la cabecera · `src/components/shared/admin-sidebar.tsx`
- [x] T26 — `expense` en `ENTITY_TYPE_LABELS`/`ENTITY_TYPE_OPTIONS`, las tres acciones en `ACTION_LABELS` y `category`/`amountCents`/`expenseDate`/`description` en `FIELD_LABELS` · `src/modules/audit/constants.ts`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas

- **`before` exacto en la auditoría**: `update` y `softDelete` bloquean la fila con `.for("update")` dentro de la tx antes de escribir; sin el lock, dos ediciones concurrentes registrarían un `before` que nunca existió (misma razón que 016 T10).
- **`created_by` con `onDelete: "restrict"`**: un egreso es un hecho contable, igual que `orders.user_id`. Dar de baja una cuenta no borra su historial de gastos.
