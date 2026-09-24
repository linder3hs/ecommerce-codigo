---
id: 016
title: Precio unitario y costo de producto
status: done
module: finance
scope: both
---

# 016 — Precio unitario y costo de producto

## Objetivo

Un admin con `product_cost.view` ve el margen (precio − costo) de cada producto en `/admin/finanzas/precio-unitario`, y con `product_cost.update` edita el costo de forma auditada.

## Alcance

Incluye:

- `products.cost_cents` (nullable) y campo Costo en el formulario de producto de 002.
- `order_items.unit_cost_cents` (nullable) poblado en checkout: congela el costo de la venta.
- Página con tabla paginada (precio, costo, margen absoluto, margen %), `PATCH` de costo auditado y permisos `product_cost.view` / `product_cost.update`.

No incluye:

- Ingresos, Egresos, Impuestos y Ganancias: specs posteriores de este módulo.
- COGS agregado, P&L y reportes: viven en el spec de Ganancias, que solo consumirá `unit_cost_cents` y deberá tratar `null` como línea sin costo, jamás como costo 0.
- Backfill de órdenes previas, orden por margen (no es columna) ni regla que impida `costo > precio`.

## Criterios de aceptación

- [x] AC1 — Dado un admin con `product_cost.view` cuando abre la página entonces ve nombre, SKU, categoría, precio, costo, margen y margen %, paginado y con búsqueda por nombre/SKU.
- [x] AC2 — Dado `cost_cents = null` entonces costo, margen y margen % muestran "—" (nunca 0 ni 100 %); dado `price_cents = 0` el margen % muestra "—" y el margen absoluto sí se calcula.
- [x] AC3 — Dado un costo mayor al precio entonces se guarda sin error y el margen negativo se resalta en la fila.
- [x] AC4 — Dado un admin con `product_cost.update` cuando guarda un costo entonces persiste y existe una fila `audit_logs` con `action: "product.cost_updated"`, `entityType: "product"` y `changes.before/after.costCents`, escrita en la misma transacción.
- [x] AC5 — Dado el campo vacío entonces `cost_cents` vuelve a `null` (costo desconocido); reenviar el mismo valor responde 400 sin escribir auditoría.
- [x] AC6 — Dado un admin sin `product_cost.update` entonces no ve el control de edición ni el campo Costo del formulario, el `PATCH` directo responde 403 y un `POST /api/products` con `costCents` numérico responde 403; sin `product_cost.view` la página redirige y el `GET` responde 403.
- [x] AC7 — Dada una compra nueva entonces cada `order_items` guarda `unit_cost_cents` con el costo vigente en ese instante y editar el costo después no altera esa fila; las órdenes previas a la migración quedan en `null`.
- [x] AC8 — Dado cualquier endpoint de órdenes (cliente o admin) entonces la respuesta no incluye `unitCostCents`; y `/api/products*` no incluye `costCents` para quien no tenga `product_cost.view`.
- [x] AC9 — Estados de carga, vacío y error con reintento en la tabla.

## Datos

Requiere migración: `npm run db:generate` + `db:migrate` + `db:seed`.

| Tabla         | Columna           | Tipo               | Constraint                                                             |
| ------------- | ----------------- | ------------------ | ---------------------------------------------------------------------- |
| `products`    | `cost_cents`      | `integer` nullable | `products_cost_cents_check`: `cost_cents is null or cost_cents >= 0`   |
| `order_items` | `unit_cost_cents` | `integer` nullable | `order_items_unit_cost_cents_check`: `unit_cost_cents is null or >= 0` |

Nullable y **sin `default 0`** en ambas: costo desconocido ≠ costo cero. Sin backfill.
Permisos nuevos en `PERMISSION_SEEDS` con `resource: "product_cost"`. `super_admin` y
`admin` los reciben por su grant `kind: "all"`; las listas de `manager`, `employee` y `audit` no se tocan.

## API

| Método | Ruta                                 | Auth                  | Body            | Response                                   |
| ------ | ------------------------------------ | --------------------- | --------------- | ------------------------------------------ |
| GET    | `/api/admin/finance/unit-price`      | `product_cost.view`   | —               | `{ data: UnitPriceRow[], meta: PageMeta }` |
| PATCH  | `/api/admin/finance/unit-price/[id]` | `product_cost.update` | `{ costCents }` | `UnitPriceRow` · 400 sin cambio · 404      |

`UnitPriceRow`: `id`, `name`, `sku`, `category`, `priceCents`, `costCents: number | null`, `marginCents: number | null`. Solo enteros en el cable; el % se deriva en cliente.

Zod (`src/modules/finance/schemas/unit-price.schema.ts`):

- `unitPriceQuerySchema` — `productQuerySchema.pick({ page: true, pageSize: true, search: true })`.
- `updateCostSchema` — `costCents`: `centsSchema("El costo").nullable()`, exportada desde `product.schema.ts`.
- `updateCostFormSchema` — string→centavos con `amountInputSchema`; vacío → `null`.

## Reutilizar

- `src/server/repositories/product.repository.ts:288` (`list`) — ya pagina, busca por nombre/SKU y resuelve la categoría con un join y desempate estable. El handler de Finanzas proyecta sobre su resultado; **no** se añade un método de listado.
- `src/app/api/products/[id]/stock/route.ts` — molde del handler auditado: `requirePermission` → Zod → `getDb().transaction` con repo + `logAudit` → `switch` del resultado discriminado fuera de la tx. Su `AdjustStockResult` (`product.repository.ts:127`) es el patrón de `UpdateCostResult`.
- `src/server/repositories/order.repository.ts:198` — único `insert(orderItems)` de la app, con spread `{ ...item, orderId }`: ampliar `CreateOrderItemData` cubre los dos caminos de pago. `src/server/checkout/resolve-cart.ts:91` es el único sitio que construye esos items.
- `src/modules/products/{schemas/product.schema.ts,constants.ts}` — `productQuerySchema`, `amountInputSchema`, `productKeys`, `SEARCH_DEBOUNCE_MS`, `PAGE_SIZE_OPTIONS`, `DEFAULT_PAGE_SIZE`.
- `src/modules/products/components/inventory-{view,table,toolbar,columns}.tsx` y `adjust-stock-dialog.tsx` — molde vigente de pantalla admin: paginación manual, `keepPreviousData`, debounce en la vista, diálogo con `toast`. `src/modules/orders/lib/date-range.ts` es el precedente de función pura con test propio en `modules/<dominio>/lib/`.
- `src/lib/format.ts` (`formatCents`, `centsToAmountInput`, `toCents`), `src/lib/{audit.ts,permissions.ts,api-error.ts,axios.ts}`, `src/types/api.ts`, `src/hooks/use-debounce.ts` y `src/components/ui/` (`table`, `input`, `button`, `badge`, `dialog`, `field`, `label`, `skeleton` ya instalados: nada que añadir). `requirePermission` devuelve el set efectivo, así que la redacción de costo se decide sin consulta extra.
- `src/proxy.ts` — **sin cambios**. Diseño de 3 capas del proyecto: el proxy solo resuelve sesión; la verificación por código de permiso va en `page.tsx` (redirect) y en `requirePermission` del handler.

## Tareas

- [x] T1 — `costCents` + su `check` · `src/server/db/schema/product.ts`
- [x] T2 — `unitCostCents` + su `check` · `src/server/db/schema/order.ts`
- [x] T3 — Generar y aplicar la migración (`drizzle/`) y sembrar los permisos con `db:seed`, que por su `onConflictDoUpdate` (`seed.ts:860`) también reescribe los productos semilla: solo en dev
- [x] T4 — Dos `PermissionSeed` de `product_cost` · `src/server/db/seed.ts`
- [x] T5 — `PRODUCT_COST_VIEW` / `PRODUCT_COST_UPDATE` en `PERMISSIONS` · `src/lib/permissions.ts`
- [x] T6 — `OrderItemRow` pasa a `Omit<InferSelectModel<typeof orderItems>, "unitCostCents">` y `loadItems` + el `select()` de items del listado por usuario pasan a proyección explícita de columnas · `src/server/repositories/order.repository.ts`
- [x] T7 — `unitCostCents` en `CreateOrderItemData` · `src/server/repositories/order.repository.ts`
- [x] T8 — `CheckoutProductRow = PublicProductRow & { costCents }` y `costCents` en el select de `findManyActiveByIds`; `PublicProductRow` no se toca · `src/server/repositories/product.repository.ts`
- [x] T9 — `unitCostCents: product.costCents` al construir `orderItems` · `src/server/checkout/resolve-cart.ts`
- [x] T10 — `updateCost(id, costCents, tx)`: lock `.for("update")` y `UpdateCostResult = { kind: "ok"; before; after } | { kind: "not_found" } | { kind: "unchanged" }` · `src/server/repositories/product.repository.ts`
- [x] T11 — Casos de `unitCostCents` en `resolve-cart.test.ts` + `it.todo` de `updateCost` con la nota `server-only` del archivo · `src/server/{checkout/resolve-cart.test.ts,repositories/product.repository.test.ts}`
- [x] T12 — `Product` pasa a `Omit<ProductRow, …|"costCents"> & { costCents?: number | null }` · `src/modules/products/types/product.ts`
- [x] T13 — `costCents` en `createProductSchema` (nullish), **omitido** en `updateProductSchema`, `cost` en `productFormSchema` y `centsSchema` exportada · `src/modules/products/schemas/product.schema.ts`
- [x] T14 — `redactCost(row, canViewCost)` puro + test · `src/modules/finance/lib/cost-redaction.ts`
- [x] T15 — Aplicar `redactCost` a las 5 respuestas con fila de producto (`route.ts` GET/POST, `[id]/route.ts` GET/PATCH, `[id]/stock/route.ts` PATCH) · `src/app/api/products/`
- [x] T16 — `ForbiddenError` en el `POST` solo si `typeof input.costCents === "number"` (`null`/ausente son el default y pasan) y el actor no tiene `product_cost.update` · `src/app/api/products/route.ts`
- [x] T17 — `marginCents` y `marginPct` puros (`null` si el costo es `null`; `marginPct` `null` si `priceCents === 0`) + test · `src/modules/finance/lib/margin.ts`
- [x] T18 — Scaffolding del módulo: `UnitPriceRow`/`UnitPriceListResponse`, los 3 schemas Zod, `unitPriceKeys` y `UNIT_PRICE_DEFAULT_QUERY` (`sortBy: "name"`, `sortDir: "asc"`) · `src/modules/finance/{types,schemas,constants.ts}`
- [x] T19 — `GET`: `requirePermission(PRODUCT_COST_VIEW)`, `productRepository.list` y proyección a `UnitPriceRow` con `marginCents` · `src/app/api/admin/finance/unit-price/route.ts`
- [x] T20 — `PATCH` auditado: `updateCostSchema`, tx con `updateCost` + `logAudit` (`product.cost_updated`, `severity: "info"`), `unchanged` → 400 · `src/app/api/admin/finance/unit-price/[id]/route.ts`
- [x] T21 — Service axios (listado + `updateCost`) y su test · `src/modules/finance/services/unit-price.service.ts`
- [x] T22 — `useUnitPrices` (`keepPreviousData`) y `useUpdateCost` (invalida `unitPriceKeys.lists()` y `productKeys.lists()`) · `src/modules/finance/hooks/`
- [x] T23 — Columnas: "—" para costo/margen nulos, margen negativo en rojo y acción "Editar costo" solo si `canEditCost` · `src/modules/finance/components/unit-price-columns.tsx`
- [x] T24 — Tabla con paginación manual, skeleton, vacío y error con reintento · `src/modules/finance/components/unit-price-table.tsx`
- [x] T25 — Toolbar de búsqueda controlada · `src/modules/finance/components/unit-price-toolbar.tsx`
- [x] T26 — Diálogo de costo: monto en soles, precio y margen resultante en vivo, vaciar = desconocido · `src/modules/finance/components/edit-cost-dialog.tsx`
- [x] T27 — Vista cliente: `useDebounce`, reset a página 1 al buscar, orquesta el diálogo · `src/modules/finance/components/unit-price-view.tsx`
- [x] T28 — Página Server Component con gate `PRODUCT_COST_VIEW` (redirect) y prop `canEditCost` · `src/app/(admin)/admin/finanzas/precio-unitario/page.tsx`
- [x] T29 — `section?: string` en `NavItem` + cabecera de grupo; ítem "Precio unitario" bajo "Finanzas" con `requiredPermission: "product_cost.view"` · `src/components/shared/admin-sidebar.tsx`
- [x] T30 — Campo Costo (S/) solo con `canEditCost`, deshabilitado en modo edición con la nota "se edita en Finanzas" · `src/modules/products/components/product-form.tsx`
- [x] T31 — Prop `canEditCost` desde la página hasta el formulario · `src/app/(admin)/admin/products/page.tsx`, `src/modules/products/components/{products-view,products-table,products-columns,product-row-actions,product-form-dialog}.tsx` (los tres del medio se sumaron al ejecutar: el diálogo de edición se monta en la fila y sin ellos T30 era inalcanzable)
- [x] T32 — `product.cost_updated` en `ACTION_LABELS` y `costCents` en `FIELD_LABELS` · `src/modules/audit/constants.ts`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

### Estado de ejecución

**Etapa 1 (backend/datos) cerrada**: T1–T20 y T32. `typecheck` ✓, `lint` ✓ (0 errores,
0 warnings), `npm test` ✓ (596 pass, 121 todo, 0 fail). Migración `0005_fast_black_tarantula.sql`
aplicada y `db:seed` corrido (2 permisos nuevos, 4 `role_permissions` nuevos).

**Etapa 2 (frontend) cerrada**: T21–T31. `typecheck` ✓, `lint` ✓ (0 errores, 0
warnings), `npm test` ✓ (596 pass, 124 todo —+3 del test bloqueado del service—, 0
fail) y `build` ✓ con `/admin/finanzas/precio-unitario` en el manifiesto de rutas.
El ítem placeholder `/admin/finance` con `requiredPermission: "users.read"` quedó
reemplazado por el real en T29.

**Alcance extra de T31**: el diálogo de edición de producto se monta en
`product-row-actions.tsx`, al que solo se llega por `products-columns.tsx` y
`products-table.tsx`. Sin bajar `canEditCost` por esa cadena, la mitad de T30 —el
campo Costo bloqueado en modo edición— sería código inalcanzable, así que los tres
archivos se sumaron a la tarea. `productsColumns` pasó de constante a la factory
`createProductsColumns(canEditCost)`, el mismo patrón que `createInventoryColumns`.

**Decisión sobre `costCents` en el `PATCH` de producto**: se elimina del body en
origen (`toUpdateInput`, en `product-form-dialog.tsx`) en vez de dejar que
`updateProductSchema` lo descarte en silencio. Un body con `costCents` sugiere que
el formulario puede cambiarlo, y si el schema dejara de omitirlo algún día el
formulario empezaría a escribir costos sin auditoría. Se borra la clave en lugar de
destructurarla porque `@typescript-eslint/no-unused-vars` está sin
`ignoreRestSiblings` y el proyecto no admite warnings.

**Verificación de los AC de UI** (renderizado real con `react-dom/server`, no
lectura de código): AC1 columnas y formato (`S/ 2.999,00`, `40,0 %`); AC2 los tres
"—" del costo desconocido sin `S/ 0,00` ni `100 %`, y con `priceCents = 0` el
margen absoluto se calcula (`S/ -15,00`) mientras el porcentual es "—"; AC3 margen
negativo con `text-destructive` en margen y margen %, y sin resaltar cuando es
positivo; AC6 el control "Editar costo" desaparece con `canEditCost` en false y el
campo Costo del formulario se oculta sin permiso, se escribe al crear y queda
`disabled` con la nota de Finanzas al editar; AC9 skeleton, vacío y error con
"Reintentar". T29 verificado igual: cabecera de grupo, filtrado por
`product_cost.view` sin cabecera huérfana y `aria-current` en la ruta activa.
Contra el servidor de desarrollo, sin sesión: `GET` y `PATCH` responden 401 y la
página redirige a `/sign-in`.

**No verificado en ejecución**: el interior de `edit-cost-dialog.tsx` (Radix monta
el contenido en un portal y no se renderiza en servidor) y el debounce/reset de
página de `unit-price-view.tsx`, que exigen interacción real. De lo primero sí se
comprobó su contrato numérico: `updateCostFormSchema` convierte "180,50" a 18050 y
el campo vacío a `null` (AC5), y la vista previa usa el mismo `marginCents` con
test propio.

## Notas

- **T6 tapa una fuga, no mejora nada**: `loadItems` y el listado de órdenes hacen `.select()` sin proyección, así que `unit_cost_cents` aparecería en el historial de compras del cliente el día que la columna exista. Va antes de T7.
- **Una sola vía auditada para el costo**: `updateProductSchema` lo omite a propósito —mismo corte quirúrgico que ya se aplica a `isActive`—, así el `PATCH` genérico de producto no puede cambiarlo sin pasar por Finanzas. La creación con costo inicial no se audita, igual que el resto del `POST` de 002.
- **`before` exacto en la auditoría**: `updateCost` bloquea la fila con `.for("update")` dentro de la tx antes de escribir; sin el lock, dos ediciones concurrentes registrarían un `before` que nunca existió.
