---
id: 014
title: Gestión de órdenes en el panel admin
status: in-progress
module: orders
scope: admin
---

# 014 — Gestión de órdenes en el panel admin

## Objetivo

Un admin con `orders.read` puede listar, filtrar y abrir cualquier orden de la
tienda, y con `orders.update_status` corregir su `status` dejando traza auditada.

## Alcance

Incluye:

- Listado paginado en `/admin/orders` con filtros de rango de fechas, `status` y búsqueda de cliente (email/nombre).
- Detalle de la orden con sus `order_items` (nombre snapshot, cantidad, precio unitario, total) y datos del cliente.
- Cambio manual de `status` con confirmación, transacción y `audit_logs`.

No incluye:

- Exportación CSV, notificaciones al cliente, reembolsos ni ninguna llamada a Stripe.
- Marcar `paid` a mano **no** descuenta stock: `decrementStock` es del webhook, en su propia transacción.
- Crear o borrar órdenes, ni editar líneas/importes (la orden es un hecho contable).

## Criterios de aceptación

- [ ] AC1 — Dado un admin con `orders.read` cuando abre `/admin/orders` entonces ve las órdenes más recientes primero, con cliente, estado, total formateado y fecha.
- [ ] AC2 — Dado el listado cuando filtra por rango de fechas, `status` y/o texto de cliente entonces la consulta se rehace en el servidor, la paginación vuelve a la página 1 y `meta.total` refleja el filtro.
- [ ] AC3 — Dada una fila cuando la abre entonces ve el detalle con todas sus líneas y la suma de líneas coincide con `totalCents`.
- [ ] AC4 — Dado un admin con `orders.update_status` cuando confirma un nuevo estado entonces la orden queda actualizada y existe una fila `audit_logs` con `action: "order.status_changed"`, `entityType: "order"` y `changes.before/after.status`.
- [ ] AC5 — Dado un admin sin `orders.update_status` entonces no ve el control de cambio de estado y el `PATCH` directo responde 403.
- [ ] AC6 — Dado que el estado de la orden cambió entre la lectura y la confirmación (webhook de Stripe) entonces el `PATCH` responde 409 y la UI pide recargar sin haber escrito nada.
- [ ] AC7 — Estados de carga, vacío y error con reintento en la tabla.

## Datos

Sin cambios de esquema. `orders` (`status`, `totalCents`, `currency`, `createdAt`,
`userId`), `order_items` (`nameSnapshot`, `unitPriceCents`, `qty`) y `users`
(`email`, `firstName`, `lastName`) ya tienen todo. Sin migración.

## API

| Método | Ruta                            | Auth                   | Body                         | Response                                                              |
| ------ | ------------------------------- | ---------------------- | ---------------------------- | --------------------------------------------------------------------- |
| GET    | `/api/admin/orders`             | `orders.read`          | —                            | `{ data: AdminOrderListItem[], meta: PageMeta }`                      |
| GET    | `/api/admin/orders/[id]`        | `orders.read`          | —                            | `{ data: AdminOrderDetail }` (404 si no existe)                       |
| PATCH  | `/api/admin/orders/[id]/status` | `orders.update_status` | `{ status, expectedStatus }` | `{ data: AdminOrderDetail }` · 400 mismo estado · 409 estado cambiado |

Zod en `src/modules/orders/schemas/admin-order.schema.ts`:

- `adminOrderQuerySchema` — `page`/`pageSize` (`z.coerce.number`, default 1/20, máx 100), `status` (`z.enum(ORDER_STATUSES)` opcional), `customerSearch` (string trim máx 100, opcional), `dateFrom`/`dateTo` (`z.coerce.date` opcional + `refine` `dateFrom <= dateTo`). Mismo patrón de fechas que `auditLogQuerySchema` (instantes ISO contra `created_at` timestamptz), **no** el `z.iso.date` del historial de cliente.
- `adminOrderIdSchema` — `z.uuid`.
- `updateOrderStatusSchema` — `{ status: z.enum(ORDER_STATUSES), expectedStatus: z.enum(ORDER_STATUSES) }`.

## Reutilizar

- `src/server/repositories/user.repository.ts:56-85,151-185` — plantilla exacta de `buildFilters` + `Promise.all([rows, count])` + offset.
- `src/app/api/admin/customers/[id]/status/route.ts` — plantilla del PATCH auditado: el **handler** abre `getDb().transaction` y llama repo + `logAudit(tx, …)`.
- `src/lib/audit.ts` (`logAudit`), `src/lib/permissions.ts` (`PERMISSIONS.ORDERS_READ`, `ORDERS_UPDATE_STATUS`, `requirePermission`, `getEffectivePermissions`).
- `src/lib/api-error.ts` — `handleApiError`, `jsonError`, `NotFoundError`, `ConflictError` (ya mapea a 409).
- `src/modules/dashboard/constants.ts` (`ORDER_STATUSES`) — espejo runtime del pgEnum; se importa, no se copia.
- `src/modules/audit/components/audit-logs-{view,table,toolbar,columns}.tsx` — plantilla de listado server-side (paginación manual + filtros + `keepPreviousData`).
- `src/modules/products/components/products-{table,toolbar,columns,view}.tsx` — plantilla de TanStack Table admin y del `useDebounce` en la búsqueda.
- `src/modules/customers/components/toggle-user-status-dialog.tsx` — plantilla del `AlertDialog` de confirmación + `toast`.
- `src/hooks/use-debounce.ts`, `src/lib/format.ts` (`formatCents`), `src/types/api.ts` (`PageMeta`), `src/lib/axios.ts` (`api`).
- shadcn ya instalado (`alert-dialog`, `badge`, `dialog`, `select`, `table`, `skeleton`, `input`, `label`): nada que añadir.

## Tareas

- [x] T1 — `list(params)` + tipos `ListAdminOrdersParams`/`AdminOrderListRow` (innerJoin a `users`, `buildFilters` fecha/status/`ilike` email+nombre; el `count` lleva el mismo innerJoin o el WHERE no resuelve) · `src/server/repositories/order.repository.ts`
- [x] T2 — `findByIdWithItemsForAdmin(id)` (orden + cliente + líneas, sin filtro por dueño) · `src/server/repositories/order.repository.ts`
- [x] T3 — `setStatus(id, status, expectedStatus, tx)` con guarda `eq(orders.status, expectedStatus)` en el WHERE, devuelve `null` si no coincide · `src/server/repositories/order.repository.ts`
- [ ] T4 — `it.todo` de las tres funciones nuevas con la nota de bloqueo `server-only` ya usada en el archivo · `src/server/repositories/order.repository.test.ts`
- [ ] T5 — Schemas Zod del listado, id y cambio de estado · `src/modules/orders/schemas/admin-order.schema.ts`
- [ ] T6 — Tipos de respuesta (`AdminOrderListItem`, `AdminOrderDetail`, `*Response`) derivados del schema Drizzle con `import type` · `src/modules/orders/types/admin-order.ts`
- [ ] T7 — Constantes del módulo: `adminOrderKeys`, `DEFAULT_PAGE_SIZE`, `PAGE_SIZE_OPTIONS`, `ALL_FILTER_VALUE`, `ORDER_STATUS_LABELS`/`OPTIONS` · `src/modules/orders/constants.ts`
- [ ] T8 — `GET` del listado: `requirePermission('orders.read')`, parseo de query, `meta` de paginación · `src/app/api/admin/orders/route.ts`
- [ ] T9 — `GET` del detalle: `orders.read` + `NotFoundError` · `src/app/api/admin/orders/[id]/route.ts`
- [ ] T10 — `PATCH` del estado: `orders.update_status`, 400 si `status === expectedStatus`, `getDb().transaction` con `setStatus` + `logAudit` (`severity: "warning"`; `ConflictError` si devuelve `null`) · `src/app/api/admin/orders/[id]/status/route.ts`
- [ ] T11 — Service axios (`list`, `detail`, `updateStatus`) · `src/modules/orders/services/admin-order.service.ts`
- [ ] T12 — Test del service (params y ruta llamada), patrón de `audit-log.service.test.ts` · `src/modules/orders/services/admin-order.service.test.ts`
- [ ] T13 — Hooks de lectura (`useAdminOrders`, `useAdminOrder`) con `keepPreviousData` · `src/modules/orders/hooks/use-admin-orders.ts`
- [ ] T14 — Hook de mutación que invalida `lists()` y `detail(id)` · `src/modules/orders/hooks/use-update-order-status.ts`
- [ ] T15 — Columnas + `features` de la tabla (cliente, estado con `Badge`, total con `formatCents`, fecha, acción "Ver") · `src/modules/orders/components/admin-orders-columns.tsx`
- [ ] T16 — Tabla con paginación manual, skeleton, vacío y error con reintento · `src/modules/orders/components/admin-orders-table.tsx`
- [ ] T17 — Toolbar: select de estado, `Desde`/`Hasta` y búsqueda de cliente · `src/modules/orders/components/admin-orders-toolbar.tsx`
- [ ] T18 — Diálogo de confirmación del cambio de estado (`AlertDialog` + `toast`, envía `expectedStatus`) · `src/modules/orders/components/change-order-status-dialog.tsx`
- [ ] T19 — Diálogo de detalle: líneas, totales y disparador del cambio de estado si `canUpdateStatus` · `src/modules/orders/components/admin-order-detail-dialog.tsx`
- [ ] T20 — Vista cliente que orquesta filtros, paginación y diálogos · `src/modules/orders/components/admin-orders-view.tsx`
- [ ] T21 — Página Server Component con gate `ORDERS_READ` (redirect) y prop `canUpdateStatus` · `src/app/(admin)/admin/orders/page.tsx`
- [ ] T22 — Ítem "Órdenes" (icono `ShoppingCart`, `requiredPermission: "orders.read"`) tras Productos · `src/components/shared/admin-sidebar.tsx`
- [ ] T23 — Etiquetas de auditoría: `order` en `ENTITY_TYPE_LABELS`/`OPTIONS`, `order.status_changed` en `ACTION_LABELS`, `status` en `FIELD_LABELS` · `src/modules/audit/constants.ts`

Verificación final: `npm run typecheck && npm run lint`

## Notas

- **Desvío respecto al pedido**: `logAudit` no se llama desde el repositorio —ningún repo importa `@/lib/audit` y sería un ciclo repo → lib → repo—. La transacción la abre el handler (T10) y ahí conviven `setStatus` y `logAudit`, igual que en `customers/[id]/status`. Regla 9 se cumple idéntico.
- **Carrera con el webhook de Stripe**: el webhook puede pasar `pending → paid` mientras el admin confirma otro estado. Por eso la guarda va en el WHERE (`expectedStatus`) y no en JavaScript; `null` es 409, no 500.
- **Módulo**: admin y cliente conviven en `src/modules/orders/` como en `products/`; los archivos nuevos van prefijados `admin-` para no chocar con `purchase-*`.
- Cuarta copia de etiquetas de estado (`checkout-success-view`, `orders-by-status-chart`, `purchase-status-tag`): son redacciones por contexto; consolidarlas es deuda de limpieza, fuera de alcance.
- `audit_logs.changes` solo lleva `{ status }` antes/después: sin email, sin ids de Stripe, sin importes.
