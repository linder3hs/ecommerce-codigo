---
id: 020
title: Ganancias (P&L del periodo)
status: done
module: finance
scope: admin
---

# 020 — Ganancias (P&L del periodo)

## Dependencias

**No se aprueba para implementación hasta que 017 y 018 estén implementados** (o `approved` y ejecutándose antes que 020): este spec no crea tablas, agrega sobre lo que ellos definen. 019 solo necesita conciliar nombres. De 016 (`done`) usa `order_items.unit_cost_cents` y `lib/margin.ts`, sin tocarlos.

- **017 (`draft`)** aporta `revenueScope`, `storeDay`, `sumRevenueTotals`, `sumRevenueByDay` (`finance.repository.ts` T6–T8), `netFromGrossCents`/`taxFromGrossCents` (`lib/tax.ts` T4) y `storeDaysInRange` (`lib/revenue-series.ts` T5). 020 usa **esos nombres tal como están escritos en 017**; si su review los cambia, T3–T6 y T11 de aquí se revisan.
- **018 (`draft`)** aporta la tabla `expenses` y `alive()` en `expense.repository.ts`.
- **019 (Impuestos) no existe todavía.** Debe adoptar `revenueScope`/`netFromGrossCents` de 017 en lugar de redefinir "ingreso neto". Ninguno de 017/019/020 pasa a `approved` sin esa conciliación de nombres.

## Objetivo

Un admin con `profit.view` ve en `/admin/finanzas/ganancias` el P&L de un rango de fechas —ingreso neto, COGS, egresos, utilidad y margen %— con tendencia diaria y margen bruto por producto. Solo lectura.

## Alcance

Incluye:

- Tarjetas del rango: ingreso neto, COGS, egresos, utilidad y margen neto %; IGV como referencia informativa.
- Serie diaria (neto, COGS, egresos, utilidad) con días sin movimiento en cero, gráfico Recharts.
- Tabla de margen bruto por producto: top 20 por bruto, con `marginCents`/`marginPct` de 016.
- Permiso nuevo `profit.view` e ítem "Ganancias", último del grupo "Finanzas".

No incluye: tabla nueva, cálculo de costo (016), CRUD de egresos (018) ni declaración de IGV (019) —solo se consumen—; fila "Otros", paginación de la tabla, granularidad mensual, comparativa con el periodo anterior, exportación CSV, multimoneda y refresco automático.

## Criterios de aceptación

- [x] AC1 — Dado un admin con `profit.view` cuando abre la página sin filtro entonces ve el mes en curso: tarjetas, serie diaria y tabla por producto.
- [x] AC2 — Dadas órdenes `pending` y `payment_failed` en el rango entonces no entran en ningún total, punto ni fila: solo `paid` cuenta, con el mismo `revenueScope` que 017.
- [x] AC3 — Dado un bruto de rango de 118 centavos entonces el neto es 100; la utilidad es `neto − COGS − egresos` y el IGV **no** se resta otra vez (se muestra rotulado como referencia, fuera de la suma).
- [x] AC4 — Dadas líneas con `unitCostCents = null` entonces el COGS las excluye, la pantalla muestra cuántas unidades quedaron sin costo y ninguna se cuenta como costo 0.
- [x] AC5 — Dado un producto cuyas líneas del rango son **todas** sin costo entonces su COGS, margen y margen % muestran "—" (`cogsCents: null`), nunca 0 ni 100 %.
- [x] AC6 — Dados egresos con `deletedAt` no nulo entonces no suman; los vigentes suman por `expenseDate` dentro del rango, ambos extremos incluidos.
- [x] AC7 — Dado un día del rango sin ventas ni egresos entonces existe en la serie con los cuatro valores en 0 (la serie tiene exactamente `rangeDays(from, to)` puntos).
- [x] AC8 — Dado un rango inválido (un solo extremo, `from > to` o más de 366 días) entonces el `GET` responde 400 y la UI deshabilita el botón antes de pedir.
- [x] AC9 — Dado un admin sin `profit.view` entonces la página redirige a `/admin/categories` y el `GET` responde 403; sin sesión, 401.
- [x] AC10 — Estados de carga, vacío (rango sin movimiento) y error con reintento en tarjetas, gráfico y tabla.

## Datos

Sin cambios de esquema y sin migración. Agrega sobre `orders` (`status`, `totalCents`, `createdAt`), `order_items` (`qty`, `unitPriceCents`, `unitCostCents`, `productId`) y `expenses` (`amountCents`, `expenseDate`, `deletedAt`).

Permiso nuevo en `PERMISSION_SEEDS`: `profit.view` · resource `profit` · action `view`. `super_admin` y `admin` lo reciben por su grant `kind: "all"`; las listas de `manager`, `employee` y `audit` no se tocan. Requiere `npm run db:seed`, no `db:generate`.

Fórmula del periodo, en centavos enteros (`Math.round` una sola vez por bucket ya sumado, nunca por orden ni por línea):

```
netCents      = netFromGrossCents(Σ orders.totalCents where status='paid')
cogsCents     = Σ (order_items.qty × order_items.unitCostCents) de esas órdenes, solo líneas con costo
expensesCents = Σ expenses.amountCents where deleted_at is null y expense_date en [from, to]
profitCents   = netCents − cogsCents − expensesCents
```

Margen **neto %** de la tarjeta = `marginPct(netCents, cogsCents + expensesCents)`. Margen **bruto %** por producto = `marginPct(netCents, cogsCents)` de esa fila. Las dos salen de `lib/margin.ts`, que ya devuelve `null` con costo desconocido o con `netCents === 0`.

## API

| Método | Ruta                        | Auth          | Body | Response       |
| ------ | --------------------------- | ------------- | ---- | -------------- |
| GET    | `/api/admin/finance/profit` | `profit.view` | —    | `ProfitReport` |

Query: `from`/`to` (`z.iso.date`, los dos o ninguno; default mes en curso resuelto por el handler).

`ProfitReport`: `range: { from, to }` · `totals: { grossCents, netCents, taxCents, cogsCents, expensesCents, profitCents, unitsWithoutCost }` · `daily: { day, netCents, cogsCents, expensesCents, profitCents }[]` · `byProduct: { id, label, units, netCents, cogsCents: number | null, unitsWithoutCost }[]`.

Zod: **sin schema nuevo**. El handler valida con `orderHistoryQuerySchema`, que ya es exactamente `from`/`to` con los tres `refine` (ambos extremos o ninguno, `from <= to`, tope `MAX_RANGE_DAYS`).

## Reutilizar

- `src/modules/finance/lib/margin.ts` — `marginCents`/`marginPct`, ya con test. **No se reimplementa margen**; el cliente los llama con los enteros del cable.
- `src/modules/orders/{schemas/order-history.schema.ts:16,lib/date-range.ts,types/order-history.ts}` — `orderHistoryQuerySchema` tal cual (verificado: solo `from`/`to` + 3 refines), `rangeToInstants` (semiabierto `[from, to)`), `currentMonthRange`, `rangeDays`, `isRangeValid`, `MAX_RANGE_DAYS`, `formatDayLabel` y el tipo `DateRange` para el estado del rango y la query key. `src/app/api/orders/route.ts:6` es el handler que ya resuelve el default de mes antes de llamar al repositorio.
- `src/modules/dashboard/components/sales-by-day-chart.tsx` — molde del gráfico: `ChartContainer`/`ChartTooltip`, tokens `var(--chart-N)`, día formateado cortando el string (nunca `new Date(day)`).
- `src/app/(admin)/admin/finanzas/precio-unitario/page.tsx` y `src/modules/finance/components/unit-price-{view,table,columns}.tsx` — molde vigente de Finanzas: gate por permiso con `redirect`, vista cliente que orquesta, skeleton/vacío/error con reintento, `UnknownValue` con texto `sr-only` para las celdas "—" (AC5) y el `pctFormatter` de un decimal (`unit-price-columns.tsx:21`), que es local a ese archivo: se replica el criterio, extraerlo a `format.ts` espera al tercer consumidor.
- **Pendientes de 017/018** (no existen aún, no los busques con Grep): `finance.repository.ts` → `revenueScope`, `storeDay`, `sumRevenueTotals`, `sumRevenueByDay` (017 T6–T8) · `lib/tax.ts` → `netFromGrossCents`, `taxFromGrossCents` (017 T4) · `lib/revenue-series.ts` → `storeDaysInRange` (017 T5) · `expense.repository.ts` → `alive()` (018 T6) · `constants.ts` → `BREAKDOWN_LIMIT = 20` (017 T13). El `revenue-toolbar.tsx` de 017 trae además el selector de desglose, así que aquí se escribe un toolbar propio de solo rango; extraer uno compartido es tarea posterior, con los tres consumidores vivos.
- `src/lib/format.ts` (`formatCents`), `src/lib/{permissions,api-error,axios}.ts`, `src/types/api.ts`, `src/server/db/seed.ts:146-157` (molde de `PermissionSeed`) y `src/components/ui/` (`card`, `chart`, `table`, `input`, `label`, `button`, `badge`, `skeleton` ya instalados: **nada que instalar**).
- Sin skill: el gráfico copia un archivo verificado del repo con los tokens `--chart-*` del tema; no se define paleta nueva.

## Tareas

Etapas: T1–T8 (datos/repositorio) · T9–T13 (contrato y datos en cliente) · T14–T20 (UI).

- [x] T1 — `PROFIT_VIEW: "profit.view"` en `PERMISSIONS` · `src/lib/permissions.ts`
- [x] T2 — `PermissionSeed` de `profit.view` + correr `db:seed` · `src/server/db/seed.ts`
- [x] T3 — Libs puros + test: `profitCents(net, cogs, expenses)`, `fillProfitByDay(days, revenue, cogs, expenses)` —merge de tres mapas dispersos sobre `storeDaysInRange`, faltantes en 0— y `cogsOrUnknown(cogsCents, units, unitsWithoutCost)`, que devuelve `null` cuando `unitsWithoutCost === units` y el entero en cualquier otro caso (AC5, es el punto donde se confunde 0 con desconocido) · `src/modules/finance/lib/profit.ts`
- [x] T4 — `sumCogsTotals(scope)` → `{ cogsCents, unitsWithoutCost }`: `order_items ⋈ orders` con el scope de 017, `sum(qty × unitCostCents)` **filtrando `unitCostCents is not null`** y en paralelo `sum(qty)` de las líneas nulas · `src/server/repositories/finance.repository.ts`
- [x] T5 — `sumCogsByDay(scope)`: misma agregación por día reutilizando **la misma instancia `storeDay`** de 017 en SELECT/GROUP BY/ORDER BY; si la clave no coincide carácter a carácter con la de la serie de ingresos, el merge de T3 pierde puntos · idem
- [x] T6 — `sumProfitByProduct(scope, limit)`: `order_items ⋈ orders ⋈ products` agrupado por `products.id`, devuelve `units`, `grossCents`, `cogsCents`, `unitsWithoutCost`; etiqueta del join, **sin** filtrar `deleted_at` ni `is_active` (una venta cerrada no desaparece), orden `gross desc` con desempate estable · idem
- [x] T7 — `sumExpenseTotals(from, to)` y `sumExpensesByDay(from, to)`: reciben los días civiles **como string**, `gte(expenseDate, from)` + `lte(expenseDate, to)` (inclusivo en los dos extremos) y `alive()`. `expense_date` ya es una clave de día de la tienda: no se convierte zona ni se usa `revenueScope` · `src/server/repositories/expense.repository.ts`
- [x] T8 — `it.todo` de las cuatro funciones nuevas con la nota de bloqueo `server-only` de cada archivo · `src/server/repositories/{finance,expense}.repository.test.ts`
- [x] T9 — Tipos `ProfitReport`, `ProfitTotals`, `ProfitDailyPoint`, `ProfitProductRow` · `src/modules/finance/types/profit.ts`
- [x] T10 — `profitKeys` · `src/modules/finance/constants.ts`
- [x] T11 — `GET`: `requirePermission(PROFIT_VIEW)`, Zod, default de mes, `rangeToInstants`, `Promise.all` de las siete consultas y ensamblado con los libs puros (`netFromGrossCents` sobre cada bruto ya sumado, `cogsOrUnknown` por fila de producto) · `src/app/api/admin/finance/profit/route.ts`
- [x] T12 — Service axios tipado + test · `src/modules/finance/services/profit.service.ts`
- [x] T13 — `useProfitReport(range)` con `keepPreviousData` · `src/modules/finance/hooks/use-profit-report.ts`
- [x] T14 — Toolbar de rango: dos `input type="date"` con `min`/`max` cruzados, botón deshabilitado con `isRangeValid` · `src/modules/finance/components/profit-toolbar.tsx`
- [x] T15 — Tarjetas: utilidad destacada, neto/COGS/egresos, margen neto % con `marginPct`, IGV rotulado "referencia, no resta" y aviso si `unitsWithoutCost > 0` · `src/modules/finance/components/profit-summary-cards.tsx`
- [x] T16 — Gráfico de la serie: utilidad en la línea principal, neto/COGS/egresos en el tooltip · `src/modules/finance/components/profit-chart.tsx`
- [x] T17 — Tabla de margen bruto por producto: `marginCents`/`marginPct` de 016, "—" con `sr-only` cuando `cogsCents` es `null` (AC5), margen negativo resaltado y marca de unidades sin costo · `src/modules/finance/components/profit-products-table.tsx`
- [x] T18 — Vista cliente: estado del rango y un solo hook repartido a los tres bloques · `src/modules/finance/components/profit-view.tsx`
- [x] T19 — Página Server Component con gate `PROFIT_VIEW` (redirect a `/admin/categories`) · `src/app/(admin)/admin/finanzas/ganancias/page.tsx`
- [x] T20 — Ítem "Ganancias" (`profit.view`, `section: "Finanzas"`) **último del tramo de Finanzas**, inmediatamente después del que esté al final en ese momento (Impuestos si 019 entró antes): `groupBySection` solo agrupa tramos consecutivos y un ítem suelto duplica la cabecera · `src/components/shared/admin-sidebar.tsx`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas

- **Dos políticas distintas para el costo ausente, a propósito**: en los totales y en la serie, las líneas sin costo se **excluyen** del COGS y se reportan como `unitsWithoutCost` (la utilidad queda optimista y la pantalla lo dice). En una fila de producto cuyas líneas son *todas* sin costo, `cogsCents` viaja `null` y la fila muestra "—": ahí no hay dato que sostenga un margen. Nunca 0.
- **La utilidad no es sumable**: `Σ daily.profitCents` puede diferir de `totals.profitCents` en hasta un centavo por día —y la columna neto de la tabla por producto, en un centavo por fila— porque el neto se redondea una vez por bucket. Cada total sale de su propia consulta y la UI **no** suma columnas.
- **El margen % de esta pantalla no coincide con el de 016** para el mismo producto: 016 compara precio de catálogo contra costo actual, y aquí el neto vendido en el rango contra el costo congelado en cada venta. Misma naturaleza que la nota "013 y 017 no coinciden por día" de 017.
- **El IGV no entra dos veces**: el 18 % ya salió al calcular el neto. Si alguien suma la línea de Impuestos (019) a esta fórmula, la utilidad baja el doble de lo que debe.
