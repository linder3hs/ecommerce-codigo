---
id: 017
title: Ingresos del módulo Finanzas
status: done
module: finance
scope: admin
---

# 017 — Ingresos del módulo Finanzas

## Objetivo

Un admin con `revenue.view` ve en `/admin/finanzas/ingresos` el ingreso neto (sin IGV) y bruto de un rango de fechas, con serie diaria y desglose por producto o categoría. Solo lectura.

## Alcance

Incluye:

- Totales del rango: bruto, neto, IGV, órdenes y unidades.
- Serie por día civil de la tienda (−05:00) con días sin ventas en cero, gráfico Recharts.
- Desglose por producto o por categoría: top 20 por bruto + fila "Otros" con el resto.
- Filtro de rango obligatorio (default mes en curso, tope 366 días) y permiso nuevo `revenue.view`.
- `revenueScope()` + `netFromGrossCents()` reutilizables: son la definición única de "qué cuenta como ingreso" para 019 (Impuestos) y 020 (Ganancias).

No incluye:

- Egresos, Impuestos (019) y Ganancias (020): specs posteriores. Nada de COGS, utilidad ni tabla de egresos aquí.
- Exportación CSV, comparativa con el periodo anterior, multi-moneda, paginación del desglose y refresco automático.

## Criterios de aceptación

- [x] AC1 — Dado un admin con `revenue.view` cuando abre la página sin filtro entonces ve el mes en curso: totales, serie diaria y desglose por producto.
- [x] AC2 — Dadas órdenes `pending` y `payment_failed` en el rango entonces ninguna aparece en ningún total, punto ni fila: solo `paid` cuenta.
- [x] AC3 — Dado un bruto de rango de 118 centavos entonces el neto es 100 y el IGV 18; con bruto 0 los tres son 0 y `neto + IGV === bruto` siempre.
- [x] AC4 — Dado un día del rango sin órdenes pagadas entonces ese día existe en la serie con bruto y neto en 0 (la serie tiene exactamente `rangeDays(from, to)` puntos).
- [x] AC5 — Dado cualquier desglose entonces la suma de la columna bruto de sus filas (incluida "Otros") es exactamente el bruto de los totales.
- [x] AC6 — Dado un producto borrado lógicamente que vendió en el rango entonces sigue apareciendo en el desglose (una venta cerrada no desaparece porque el producto se dé de baja).
- [x] AC7 — Dado un rango inválido (un solo extremo, `from > to` o más de 366 días) entonces el `GET` responde 400 y la UI deshabilita el botón antes de pedir.
- [x] AC8 — Dado un admin sin `revenue.view` entonces la página redirige a `/admin/categories` y el `GET` responde 403; sin sesión, 401.
- [x] AC9 — Estados de carga, vacío (rango sin ventas) y error con reintento en gráfico y tabla.

## Datos

Sin cambios de esquema y sin migración: agrega sobre `orders` (`status`, `totalCents`, `createdAt`) y `order_items` (`productId`, `unitPriceCents`, `qty`) con join a `products`/`categories` solo para la etiqueta. `order_items.unitCostCents` no se lee (es de 020).

Permiso nuevo en `PERMISSION_SEEDS`: `revenue.view` · resource `revenue` · action `view`. `super_admin` y `admin` lo reciben por su grant `kind: "all"`; las listas de `manager`, `employee` y `audit` no se tocan. Requiere `npm run db:seed`, no `db:generate`.

**Ingreso real** = `orders.status = 'paid'`. **Fecha de ingreso** = `orders.created_at`: el schema no tiene `paid_at` y `updated_at` lleva `$onUpdate`, así que cualquier PATCH de 014 lo reescribiría y falsearía el histórico. Limitación consciente: en un pago asíncrono la confirmación puede caer días después de la creación y se cuenta en el día de la creación.

**Neto sin IGV**: el precio guardado ya incluye 18 %. `netCents = Math.round(grossCents * 100 / 118)` y `taxCents = grossCents - netCents` (la resta garantiza que no se pierda un centavo). Se redondea **una sola vez por bucket ya sumado**, nunca por orden ni por línea.

## API

| Método | Ruta                          | Auth           | Body | Response        |
| ------ | ----------------------------- | -------------- | ---- | --------------- |
| GET    | `/api/admin/finance/revenue`  | `revenue.view` | —    | `RevenueReport` |

Query: `from`/`to` (`z.iso.date`, los dos o ninguno) y `breakdown` (`product` \| `category`, default `product`).

`RevenueReport`: `range: { from, to }` · `totals: { grossCents, netCents, taxCents, orders, units }` · `daily: { day, grossCents, netCents }[]` · `breakdown: { id: string | null, label, units, grossCents, netCents }[]` (`id: null` es la fila "Otros").

Zod (`src/modules/finance/schemas/revenue.schema.ts`): `revenueQuerySchema`, calcado de `orderHistoryQuerySchema` (mismos tres `refine`: ambos extremos o ninguno, `from <= to`, `rangeDays <= MAX_RANGE_DAYS`) más `breakdown`. El default de mes en curso lo resuelve el handler, no el schema: el reloj no entra al schema.

## Reutilizar

- `src/modules/orders/lib/date-range.ts` — `rangeToInstants` (intervalo semiabierto `[from, to)`), `currentMonthRange`, `rangeDays`, `isRangeValid`, `MAX_RANGE_DAYS`, `formatDayLabel`, `STORE_UTC_OFFSET`. Ya tiene test propio; es el dueño del calendario de la tienda y por eso `STORE_TIME_ZONE` se agrega ahí (T3) y no en el repositorio.
- `src/app/api/orders/route.ts:6` — precedente del handler que resuelve el rango con `date-range` (default de mes) antes de llamar al repositorio.
- `src/server/repositories/dashboard.repository.ts:38` — patrón de la clave de día en SQL: **una sola** instancia `sql` reutilizada en SELECT, GROUP BY y ORDER BY. No se reutiliza `sumPaidTotalsByDay`: agrupa por día UTC y solo acepta `since`, sin tope superior (ver Notas).
- `src/modules/dashboard/lib/series.ts` — patrón de relleno en cero. No se reutiliza `fillSalesByDay`: sus claves son días UTC y su ventana son 30 días fijos.
- `src/modules/dashboard/components/sales-by-day-chart.tsx` — molde del gráfico: `ChartContainer`/`ChartTooltip` de shadcn, tokens `var(--chart-N)`, día formateado cortando el string (nunca `new Date(day)`). No bajar `recharts` de 3.10.1.
- `src/modules/finance/{components/unit-price-view.tsx,components/unit-price-table.tsx,services,hooks}` y `src/app/(admin)/admin/finanzas/precio-unitario/page.tsx` — molde vigente de pantalla de Finanzas: gate por permiso con `redirect`, vista cliente que orquesta, skeleton/vacío/error con reintento.
- `src/modules/orders/components/admin-orders-toolbar.tsx:85-103` — los dos `input type="date"` con `min`/`max` cruzados.
- `src/server/db/seed.ts:146-157` — molde de `PermissionSeed`. `src/lib/format.ts` (`formatCents`), `src/lib/{permissions,api-error,axios}.ts`, `src/types/api.ts`.
- `src/components/ui/`: `card`, `chart`, `table`, `select`, `input`, `label`, `button`, `badge`, `skeleton` ya instalados. **Nada que instalar.**
- Sin skill: el gráfico copia un archivo verificado del repo y usa los tokens `--chart-*` del tema; no se define paleta nueva.

## Tareas

- [x] T1 — `REVENUE_VIEW: "revenue.view"` en `PERMISSIONS` · `src/lib/permissions.ts`
- [x] T2 — `PermissionSeed` de `revenue.view` + correr `db:seed` · `src/server/db/seed.ts`
- [x] T3 — `STORE_TIME_ZONE = "America/Lima"` junto a `STORE_UTC_OFFSET`, con la nota de que ambos describen el mismo calendario · `src/modules/orders/lib/date-range.ts`
- [x] T4 — `IGV_PERCENT`, `netFromGrossCents`, `taxFromGrossCents` + test (0→0, 1→1, 59→50, 100→85, 118→100 y `tax === gross − net`) · `src/modules/finance/lib/tax.ts`
- [x] T5 — `storeDaysInRange(from, to)`, `fillRevenueByDay(days, rows)` y `appendOthersRow(rows, totals)` —"Otros" solo si el resto de bruto o unidades es > 0; resto negativo se omite— + test · `src/modules/finance/lib/revenue-series.ts`
- [x] T6 — Repositorio nuevo: `REVENUE_ORDER_STATUSES = ["paid"]`, `revenueScope(fromInstant, toInstant)` (`inArray` + `gte`/`lt`, nunca `lte`) y `storeDay` con la zona emitida como literal SQL (`` sql.raw(`'${STORE_TIME_ZONE}'`) ``, con las comillas simples dentro del literal), nunca interpolada · `src/server/repositories/finance.repository.ts`
- [x] T7 — `sumRevenueByDay(scope)`: `grossCents` por día agrupado en Postgres, `sum()` casteado a número · `src/server/repositories/finance.repository.ts`
- [x] T8 — `sumRevenueTotals(scope)`: bruto y conteo de órdenes sobre `orders`; unidades sobre `order_items` con `innerJoin(orders)` y el mismo scope · `src/server/repositories/finance.repository.ts`
- [x] T9 — `sumRevenueBreakdown(scope, groupBy, limit)`: `order_items` ⋈ `orders` (el scope vive ahí) ⋈ `products` [⋈ `categories`], agrupa por `products.id` o `categories.id`, etiqueta del join (no `nameSnapshot`), **sin** filtrar `deleted_at` ni `is_active` en ninguno de los dos, orden `gross desc` + desempate estable · `src/server/repositories/finance.repository.ts`
- [x] T10 — `it.todo` de las cuatro funciones con la nota de bloqueo `server-only` ya usada en el archivo hermano · `src/server/repositories/finance.repository.test.ts`
- [x] T11 — `revenueQuerySchema` + test · `src/modules/finance/schemas/revenue.schema.ts`
- [x] T12 — Tipos `RevenueReport`, `RevenueDailyPoint`, `RevenueBreakdownRow`, `RevenueBreakdown` · `src/modules/finance/types/revenue.ts`
- [x] T13 — `revenueKeys`, `BREAKDOWN_LIMIT = 20`, `REVENUE_BREAKDOWNS` (valor + etiqueta) · `src/modules/finance/constants.ts`
- [x] T14 — `GET`: `requirePermission(REVENUE_VIEW)`, Zod, rango → instantes, `Promise.all` de las tres consultas y ensamblado del `RevenueReport` con los libs puros · `src/app/api/admin/finance/revenue/route.ts`
- [x] T15 — Service axios tipado + test · `src/modules/finance/services/revenue.service.ts`
- [x] T16 — `useRevenueReport(params)` con `keepPreviousData` · `src/modules/finance/hooks/use-revenue-report.ts`
- [x] T17 — Toolbar: rango de fechas y selector de desglose, botón deshabilitado con `isRangeValid` · `src/modules/finance/components/revenue-toolbar.tsx`
- [x] T18 — Tarjetas de totales (neto destacado, bruto e IGV como referencia, órdenes y unidades) · `src/modules/finance/components/revenue-summary-cards.tsx`
- [x] T19 — Gráfico de la serie diaria: neto en la línea, bruto en el tooltip · `src/modules/finance/components/revenue-chart.tsx`
- [x] T20 — Tabla del desglose con "Otros" siempre al final · `src/modules/finance/components/revenue-breakdown-table.tsx`
- [x] T21 — Vista cliente: estado del rango y del desglose, un solo hook repartido a los tres bloques · `src/modules/finance/components/revenue-view.tsx`
- [x] T22 — Página Server Component con gate `REVENUE_VIEW` (redirect a `/admin/categories`) · `src/app/(admin)/admin/finanzas/ingresos/page.tsx`
- [x] T23 — Ítem "Ingresos" con `requiredPermission: "revenue.view"` y `section: "Finanzas"`, **adyacente** a Precio unitario en `NAV_ITEMS`: el agrupado es por tramos consecutivos y separarlos crea dos cabeceras · `src/components/shared/admin-sidebar.tsx`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas

- **El nombre de zona va inline en el `sql`**: interpolarlo como parámetro emite un bind distinto en SELECT y en GROUP BY, y Postgres rechaza la consulta porque los dos nodos no son estructuralmente iguales.
- **Neto no es sumable**: `Σ daily.netCents` y `Σ breakdown.netCents` pueden diferir de `totals.netCents` en hasta un centavo por fila. El neto de los totales sale de `netFromGrossCents(totals.grossCents)`; la UI **no** suma columnas de neto. Solo el bruto reconcilia exacto (AC5); un `paid` que entre por webhook entre las dos consultas puede dejar el resto en negativo por unos segundos, y se acepta: el reporte es de lectura y el siguiente refresco lo corrige.
- **Todo el cálculo pasa en el servidor**: el repositorio devuelve bruto y conteos, el handler aplica los libs puros, el cliente solo formatea. Así 019 y 020 consumen las mismas funciones sin recalcular nada en el navegador.
- **`Σ order_items = orders.totalCents`** es invariante verificado (`resolve-cart.ts:103`): no hay envío ni descuentos, por eso el desglose puede reconciliar con los totales.
- **013 y 017 no van a coincidir por día**: el dashboard agrupa por día UTC y esta pantalla por día de Lima, así que una compra de las 20:00 cae en días distintos en cada una. Los totales del rango sí coinciden. No se toca 013.
- **`paid_at`**: si algún día existe, el único cambio es `revenueScope()`; ese es el motivo de centralizar el filtro en vez de dejarlo en el handler.
- **Una sola moneda** (`STRIPE_CURRENCY`), igual que 013: no se convierte ni se agrupa por `currency`.
