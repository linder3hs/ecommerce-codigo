---
id: 015
title: Inventario y ajuste rápido de stock
status: in-progress
module: products
scope: admin
---

# 015 — Inventario y ajuste rápido de stock

## Objetivo

Un admin con `products.read` puede ver el stock de todo el catálogo ordenado por
faltante, y con `products.update` ajustarlo desde la fila con un delta auditado.

## Alcance

Incluye:

- Listado paginado en `/admin/inventory`, orden por defecto `stock asc`, filtro "solo stock bajo" (`stock <= LOW_STOCK_THRESHOLD`) y búsqueda por nombre/SKU.
- Ajuste de stock por delta con signo (`+50`, `-3`) que se **suma** al valor actual, en transacción con `audit_logs`.

No incluye:

- Historial/vista de movimientos de stock (los ajustes quedan en `audit_logs`, sin pantalla dedicada).
- Umbral configurable por producto, alertas o notificaciones automáticas, reportes ni exportación.
- Edición de cualquier otro campo del producto: eso sigue en `/admin/products`.

## Criterios de aceptación

- [ ] AC1 — Dado un admin con `products.read` cuando abre `/admin/inventory` entonces ve nombre, SKU, categoría y stock, con los de menor stock primero.
- [ ] AC2 — Dado el listado cuando activa "solo stock bajo" o escribe en la búsqueda entonces la consulta se rehace en servidor, vuelve a la página 1 y `meta.total` refleja el filtro.
- [ ] AC3 — Dada una fila cuando confirma un delta `+N` entonces el stock queda en `anterior + N` sin abrir el formulario de producto.
- [ ] AC4 — Dado un delta que dejaría el stock negativo entonces la respuesta es 400 con el stock actual en el mensaje y nada se escribe (ni producto ni `audit_logs`).
- [ ] AC5 — Dado un ajuste aplicado entonces existe una fila `audit_logs` con `action: "product.stock_adjusted"`, `entityType: "product"`, `changes.before/after.stock` y `metadata.delta`, sin PII.
- [ ] AC6 — Dado un admin sin `products.update` entonces no ve el control de ajuste y el `PATCH` directo responde 403.
- [ ] AC7 — Estados de carga, vacío y error con reintento en la tabla.

## Datos

Sin cambios de esquema y sin migración. `products.stock` ya es
`integer notNull default 0` con `check("products_stock_check", stock >= 0)`
(`src/server/db/schema/product.ts:27,59`); el ajuste respeta el check con una
guarda en el `WHERE`, no dejando que la BD falle. Permisos ya sembrados:
`seed.ts:63` (`products.read`), `seed.ts:69` (`products.update`), asignados a los
roles en `seed.ts:190-191,207-208`. Sin permisos nuevos.

## API

| Método | Ruta                       | Auth               | Body        | Response                                       |
| ------ | -------------------------- | ------------------ | ----------- | ---------------------------------------------- |
| GET    | `/api/products`            | `products.read`    | —           | `{ data: ProductListItem[], meta: PageMeta }` (existente, + `lowStockOnly`) |
| PATCH  | `/api/products/[id]/stock` | `products.update`  | `{ delta }` | `Product` (bare) · 400 delta 0 / stock negativo · 404 |

Zod:

- `productQuerySchema` (existente, `src/modules/products/schemas/product.schema.ts`) — se le añade `lowStockOnly`: `z.enum(["true","false"]).transform(v => v === "true").optional()`, mismo patrón que `isActive`. El handler lo traduce a `maxStock: LOW_STOCK_THRESHOLD`; la constante se importa solo en servidor, igual que en `/api/admin/dashboard/route.ts:5,51`.
- `adjustStockSchema` (nuevo) — `delta`: int, distinto de 0, entre `-1_000_000` y `1_000_000`.
- `adjustStockFormSchema` (nuevo) — variante string→int para React Hook Form, patrón de `productFormSchema`.

## Reutilizar

- `src/server/repositories/product.repository.ts:50,165,272` — `ListProductsParams` + `buildFilters` + `list()` ya hacen paginación, `ilike` sobre nombre/SKU/slug, join de categoría y orden por `stock`. Se extienden, no se duplican.
- `src/server/repositories/order.repository.ts:541` (`decrementStock`) — plantilla exacta de la escritura atómica: `SET stock = stock ± n` con la guarda en el `WHERE` y relectura para distinguir el motivo del fallo.
- `src/app/api/admin/orders/[id]/status/route.ts` — plantilla del handler auditado: `getDb().transaction` + repo + `logAudit(tx, …)`.
- `src/modules/dashboard/constants.ts:7` (`LOW_STOCK_THRESHOLD = 5`) — se importa, no se copia.
- `src/modules/products/{types/product.ts,schemas/product.schema.ts,constants.ts:43}` — `ProductListItem`, `ProductQueryInput`, `productKeys`, `SEARCH_DEBOUNCE_MS`, `PAGE_SIZE_OPTIONS` tal cual.
- `src/modules/products/hooks/use-products.ts` + `services/product.service.ts` — la lectura se reusa **sin tocar**: misma query key, misma caché que `/admin/products`.
- `src/modules/orders/components/admin-orders-{table,toolbar,view}.tsx` — patrón vigente de listado admin server-side (paginación manual, `keepPreviousData`, debounce en la vista).
- `src/modules/customers/components/toggle-user-status-dialog.tsx` — patrón de diálogo de confirmación + `toast`.
- `src/hooks/use-debounce.ts` — debounce de la búsqueda, consumido por T15.
- `src/lib/audit.ts` (`logAudit`), `src/lib/permissions.ts` (`PERMISSIONS.PRODUCTS_READ/PRODUCTS_UPDATE`, `requirePermission`, `getEffectivePermissions`), `src/lib/api-error.ts` (`handleApiError`, `jsonError`, `NotFoundError`), `src/lib/axios.ts`, `src/types/api.ts`.
- shadcn: nada que instalar (`table`, `input`, `button`, `badge`, `dialog`, `switch`, `skeleton`, `label` ya están en `src/components/ui/`).
- `src/proxy.ts:44-50` — el matcher ya cubre `/admin(.*)` y `/api(.*)`: sin cambios.

## Tareas

- [x] T1 — `maxStock?: number` en `ListProductsParams` + `lte(products.stock, maxStock)` en `buildFilters` (guarda `!== undefined`, no falsy: `maxStock: 0` es válido, igual que el comentario ya existente en `minPriceCents`), y `asc(products.id)` como desempate del `orderBy` de `list()` · `src/server/repositories/product.repository.ts`
- [x] T2 — `adjustStock(id, delta, tx)`: `UPDATE ... SET stock = stock + delta WHERE id AND alive() AND stock >= -delta RETURNING *`; si no hay fila, relee el stock en la misma `tx` y devuelve un resultado discriminado `{ kind: "ok", product } | { kind: "not_found" } | { kind: "insufficient", current }` · `src/server/repositories/product.repository.ts`
- [x] T3 — `it.todo` de `adjustStock` y del filtro `maxStock`, con la nota de bloqueo `server-only` ya usada en el archivo · `src/server/repositories/product.repository.test.ts`
- [x] T4 — `lowStockOnly` en `productQuerySchema` y `adjustStockSchema` + `adjustStockFormSchema` · `src/modules/products/schemas/product.schema.ts`
- [x] T5 — Constante `INVENTORY_DEFAULT_QUERY` (`sortBy: "stock"`, `sortDir: "asc"`, `pageSize: 20`) · `src/modules/products/constants.ts`
- [x] T6 — Traducir `lowStockOnly` → `maxStock: LOW_STOCK_THRESHOLD` en el `GET` existente · `src/app/api/products/route.ts`
- [ ] T7 — `PATCH` del ajuste: `requirePermission('products.update')`, `adjustStockSchema`, `getDb().transaction` con `adjustStock` + `logAudit`; la tx **devuelve** el resultado y el `switch` va fuera (no hay clase de error 400 en `api-error.ts`): `not_found` → `NotFoundError`, `insufficient` → `jsonError(400, …stock actual N…)` · `src/app/api/products/[id]/stock/route.ts`
- [ ] T8 — `adjustStock(id, delta)` en el service existente (`PATCH /products/:id/stock`, devuelve `Product`) · `src/modules/products/services/product.service.ts`
- [ ] T9 — Test del nuevo método del service (ruta y body enviados) · `src/modules/products/services/product.service.test.ts`
- [ ] T10 — Hook de mutación que invalida `productKeys.lists()` y `productKeys.detail(id)` en éxito y también en error (tras un 400 la fila en pantalla está desactualizada) · `src/modules/products/hooks/use-adjust-stock.ts`
- [ ] T11 — Columnas: nombre, SKU, categoría, stock con `Badge variant="destructive"` si `stock <= LOW_STOCK_THRESHOLD`, y acción "Ajustar" solo si `canAdjust` · `src/modules/products/components/inventory-columns.tsx`
- [ ] T12 — Tabla con paginación manual, skeleton, vacío y error con reintento · `src/modules/products/components/inventory-table.tsx`
- [ ] T13 — Toolbar: búsqueda controlada (texto crudo) + `Switch` "Solo stock bajo" · `src/modules/products/components/inventory-toolbar.tsx`
- [ ] T14 — Diálogo de ajuste: input de delta con signo, stock actual y resultante en pantalla, `toast` al confirmar · `src/modules/products/components/adjust-stock-dialog.tsx`
- [ ] T15 — Vista cliente: `useProducts(INVENTORY_DEFAULT_QUERY + filtros)`, `useDebounce` de la búsqueda, reset a página 1 al cambiar filtro o switch, orquesta el diálogo · `src/modules/products/components/inventory-view.tsx`
- [ ] T16 — Página Server Component con gate `PRODUCTS_READ` (redirect) y prop `canAdjust` desde `PRODUCTS_UPDATE` · `src/app/(admin)/admin/inventory/page.tsx`
- [ ] T17 — Ítem "Inventario" (icono `PackageSearch`, `requiredPermission: "products.read"` literal) después de Productos · `src/components/shared/admin-sidebar.tsx`
- [ ] T18 — Etiquetas de auditoría: `product` en `ENTITY_TYPE_OPTIONS`, `product.stock_adjusted` en `ACTION_LABELS`, `stock` y `delta` en `FIELD_LABELS` · `src/modules/audit/constants.ts`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas

- **Orden `stock asc` no es único** (muchas filas en 0/1/2): con `OFFSET` las filas se repetirían o se saltarían entre páginas. De ahí el desempate por `products.id` en T1, que además arregla el listado de `/admin/products`.
- **Carrera entre dos ajustes concurrentes**: la guarda `stock >= -delta` va en el `WHERE` del `UPDATE`, nunca leyendo-y-escribiendo en JS. Un delta negativo imposible no llega al `check` de la BD.
- El repositorio no importa `@/lib/audit` (sería un ciclo repo → lib → repo): la transacción la abre el handler, igual que en 014. `adjustStock` necesita `import type { Tx } from "@/server/db"`, que este repositorio aún no importa.
- `severity: "info"` en el log: el ajuste de inventario es operación rutinaria, no una corrección excepcional como el cambio de estado de una orden.
- La ruta vive junto a su hermana `/api/products/[id]` (mismo recurso, mismo `products.update`) y devuelve el `Product` plano, no `{ data }`, como el `PATCH` existente. No se mueve a `/api/admin/*`.
- Lectura compartida con `/admin/products`: al reusar `productKeys`, un ajuste invalida también la caché de esa pantalla. Es lo deseado.
