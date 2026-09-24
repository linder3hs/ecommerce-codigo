---
id: 019
title: Impuestos (IGV) del módulo Finanzas
status: done
module: finance
scope: admin
---

# 019 — Impuestos (IGV) del módulo Finanzas

## Objetivo

Un admin con `tax.view` ve en `/admin/finanzas/impuestos` el IGV (18 %) contenido en las ventas pagadas de un rango, agregado por mes o trimestre. Solo lectura.

## Alcance

Incluye:

- Totales del rango: bruto, neto sin IGV e IGV.
- Tabla por periodo (mes o trimestre) del calendario de la tienda, con periodos sin ventas en 0 y marca de periodo incompleto.
- Filtro de rango (default mes en curso, tope 366 días) y permiso nuevo `tax.view`.
- Ítem "Impuestos" bajo el grupo Finanzas del sidebar.

No incluye:

- **Crédito fiscal** (IGV de compras), notas de crédito, devoluciones, retenciones ni percepciones: esto es débito fiscal informativo, no una declaración.
- Ingresos (017), Egresos (018) y Ganancias (020): acá no se calcula COGS, utilidad ni P&L.
- Tabla nueva, IGV persistido, export CSV, serie diaria (es de 017) y tasa configurable: 18 % fijo.

## Criterios de aceptación

- [x] AC1 — Dado un admin con `tax.view` cuando abre la página sin filtro entonces ve el mes en curso: totales y la fila del periodo.
- [x] AC2 — Dadas órdenes `pending` y `payment_failed` en el rango entonces no aportan a ningún total ni fila: solo `paid` genera IGV.
- [x] AC3 — Dado un bruto de 118 centavos entonces el neto es 100 y el IGV 18; con bruto 0 los tres son 0, y `neto + IGV === bruto` en cada fila y en los totales.
- [x] AC4 — Dado el rango entonces aparece **todo** mes/trimestre que lo intersecta, con 0 si no hubo ventas pagadas: sin huecos y en orden cronológico.
- [x] AC5 — Dado un periodo recortado por el rango **o que todavía contiene el día de hoy** entonces la fila se marca "Incompleto"; con el rango por defecto la única fila siempre está incompleta, porque el mes en curso no ha cerrado.
- [x] AC6 — Dado un rango inválido (un solo extremo, `from > to` o más de 366 días) entonces el `GET` responde 400 y la UI deshabilita el botón antes de pedir.
- [x] AC7 — Dado un admin sin `tax.view` entonces la página redirige a `/admin/categories` y el `GET` responde 403; sin sesión, 401.
- [x] AC8 — Estados de carga y error con reintento en tarjetas y tabla; vacío = `totals.grossCents === 0`: aviso sobre la tabla y las filas en 0 se mantienen (AC4).

## Datos

Sin cambios de esquema y sin migración: solo lectura de `orders` (`status`, `total_cents`, `created_at`) a través de la función de 017. No se crea tabla ni se persiste el IGV.

Permiso nuevo en `PERMISSION_SEEDS`: `tax.view` · resource `tax` · action `view`. `super_admin` y `admin` lo reciben por su grant `kind: "all"`; las listas de `manager`, `employee` y `audit` no se tocan. Requiere `npm run db:seed`, no `db:generate`.

**Venta con IGV** = `orders.status = 'paid'`. El pgEnum tiene exactamente tres valores (`src/server/db/schema/order.ts:17-24`): `pending` y `payment_failed` no generan IGV. **Fecha** = `orders.created_at` proyectada al día civil de la tienda, misma decisión (y misma limitación de pago asíncrono) que 017.

**Redondeo**: el precio guardado ya incluye 18 %. `netCents = Math.round(grossCents * 100 / 118)` y `taxCents = grossCents - netCents` (017 T4) — equivalente a `Math.round(grossCents * 18 / 118)` para todo entero, y la resta garantiza que no se pierda un centavo. Se redondea **una vez por periodo ya sumado** y una vez por el total del rango; nunca por orden ni por línea, y nada se guarda.

## API

| Método | Ruta                     | Auth       | Body | Response    |
| ------ | ------------------------ | ---------- | ---- | ----------- |
| GET    | `/api/admin/finance/tax` | `tax.view` | —    | `TaxReport` |

Query: `from`/`to` (`z.iso.date`, los dos o ninguno; el default de mes en curso lo resuelve el handler, no el schema) y `period` (`month` \| `quarter`, default `month`).

`TaxReport`: `range: { from, to }` · `period` · `ratePercent: 18` · `totals: { grossCents, netCents, taxCents }` · `periods: { key, label, from, to, partial, grossCents, netCents, taxCents }[]`.

`totals.grossCents` es la suma de `periods[].grossCents` (mismo array, sin segunda consulta); su neto e IGV se derivan de ese bruto, no de sumar columnas.

Zod: `taxQuerySchema` · `src/modules/finance/schemas/tax-report.schema.ts`.

## Reutilizar

**Verificado en el repo hoy:**

- `src/modules/orders/lib/date-range.ts` — `rangeToInstants` (semiabierto `[from, to)`), `currentMonthRange`, `todayInStore`, `rangeDays`, `isRangeValid`, `MAX_RANGE_DAYS`, `toStoreDay`.
- `src/modules/orders/schemas/order-history.schema.ts:16-35` — molde exacto de los tres `refine` del rango (ambos extremos o ninguno, `from <= to`, tope de días).
- `src/app/api/orders/route.ts` — precedente del handler que resuelve el default de mes con `date-range` antes de llamar al repositorio.
- `src/modules/finance/{constants.ts,services/unit-price.service.ts,hooks/use-unit-prices.ts,components/unit-price-view.tsx,components/unit-price-table.tsx}` y `src/app/(admin)/admin/finanzas/precio-unitario/page.tsx` — molde vigente de pantalla de Finanzas: gate con `getEffectivePermissions` + `redirect`, `RESOURCE` relativo (axios ya trae `/api`), `keepPreviousData`, skeleton/vacío/error con reintento. El módulo ya existe: se añaden archivos, no infraestructura.
- `src/modules/orders/components/admin-orders-toolbar.tsx:85-103` — los dos `input type="date"` con `min`/`max` cruzados.
- `src/server/db/seed.ts:146-151` (`product_cost.view`) — molde de `PermissionSeed`. `src/lib/permissions.ts` (`PERMISSIONS`, `getEffectivePermissions`, `requirePermission`), `src/lib/format.ts` (`formatCents`), `src/lib/{api-error,axios}.ts`.
- `src/components/ui/`: `card`, `table`, `select`, `input`, `label`, `button`, `badge`, `skeleton` ya instalados. **Nada que instalar** y sin Recharts: este reporte es tabla; el gráfico de serie es de 017.
- `src/types/api.ts` (`PageMeta`) **no aplica**: el reporte no se pagina, devuelve un objeto único.
- `src/proxy.ts` — **sin cambios**. Tres capas: sesión en el proxy, `redirect` en la página, `requirePermission` en el handler.

**Definido por 017 (draft) — bloqueante: 019 no arranca hasta que T3/T4/T6/T7 de 017 estén mergeados.** Nada de esto se reescribe:

- `src/server/repositories/finance.repository.ts` — `revenueScope(fromInstant, toInstant)` (status `paid` + rango) y `sumRevenueByDay(scope)` (bruto por día de la tienda). Es la **única** consulta de 019; `STORE_TIME_ZONE` (017 T3) es dependencia transitiva de ahí, 019 no lo importa.
- `src/modules/finance/lib/tax.ts` — `IGV_PERCENT`, `netFromGrossCents`, `taxFromGrossCents`.

## Tareas

Etapas: T1–T7 (backend) · T8–T15 (UI).

- [x] T1 — `TAX_VIEW: "tax.view"` en `PERMISSIONS` · `src/lib/permissions.ts`
- [x] T2 — `PermissionSeed` de `tax.view` + correr `db:seed` · `src/server/db/seed.ts`
- [x] T3 — Libs puros `taxPeriodKey(day, period)`, `periodBounds(key, period)`, `formatPeriodLabel(key, period)`, `periodKeysInRange(from, to, period)` y `bucketTaxByPeriod(rangeFrom, rangeTo, period, dailyGross, today)` — relleno en cero, orden cronológico y `partial` = el periodo se sale del rango **o** su último día es hoy o posterior (`today` entra por parámetro: el lib no lee el reloj) — + test: claves de mes y trimestre, límites Q1–Q4, cruce de año, rango de un día, hoy dentro del periodo · `src/modules/finance/lib/tax-periods.ts`
- [x] T4 — `taxQuerySchema`: `from`/`to` con los tres `refine` de `orderHistoryQuerySchema` más `period` · `src/modules/finance/schemas/tax-report.schema.ts`
- [x] T5 — Tipos `TaxPeriod`, `TaxPeriodRow`, `TaxReport` · `src/modules/finance/types/tax.ts`
- [x] T6 — `taxKeys` y `TAX_PERIODS` (valor + etiqueta) · `src/modules/finance/constants.ts`
- [x] T7 — `GET`: `requirePermission(TAX_VIEW)`, Zod, default de mes, `rangeToInstants` → `revenueScope` → `sumRevenueByDay`, bucketing con los libs puros pasando `todayInStore()`, y totales derivados del array · `src/app/api/admin/finance/tax/route.ts`
- [x] T8 — Service axios tipado + test · `src/modules/finance/services/tax.service.ts`
- [x] T9 — `useTaxReport(params)` con `keepPreviousData` · `src/modules/finance/hooks/use-tax-report.ts`
- [x] T10 — Toolbar: rango de fechas y `Select` de periodicidad, botón deshabilitado con `isRangeValid` · `src/modules/finance/components/tax-toolbar.tsx`
- [x] T11 — Tarjetas de totales: IGV destacado, bruto y neto como referencia · `src/modules/finance/components/tax-summary-cards.tsx`
- [x] T12 — Tabla por periodo con `Badge` "Incompleto" y `formatCents` · `src/modules/finance/components/tax-periods-table.tsx`
- [x] T13 — Vista cliente: estado del rango y de la periodicidad, un solo hook repartido a tarjetas y tabla · `src/modules/finance/components/tax-view.tsx`
- [x] T14 — Página Server Component con gate `TAX_VIEW` (redirect a `/admin/categories`) · `src/app/(admin)/admin/finanzas/impuestos/page.tsx`
- [x] T15 — Ítem "Impuestos" (icono `Receipt`, `requiredPermission: "tax.view"`, `section: "Finanzas"`) como **último del tramo Finanzas** vigente al mergear — orden canónico del bloque: Precio unitario → Ingresos (017) → Egresos (018) → Impuestos, sin ningún ítem raíz en medio, porque `groupBySection` solo agrupa tramos consecutivos y un ítem suelto duplicaría la cabecera · `src/components/shared/admin-sidebar.tsx`

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas

- **Débito fiscal, no declaración**: no resta crédito fiscal ni ajustes por notas de crédito. SUNAT declara por mes; "trimestre" es una vista de lectura, no un periodo fiscal.
- **Un periodo incompleto no es declarable**: lo recorta el rango o todavía está corriendo. Por eso `partial` viaja en la respuesta y no se adivina en el cliente.
- **Neto e IGV no son sumables**: `Σ periods.taxCents` puede diferir de `totals.taxCents` en centavos, porque el total redondea sobre el bruto del rango. La fila del periodo es la cifra que se declara; el total es referencia y la UI no suma columnas.
- **Una sola consulta**: el bruto por día sale de `sumRevenueByDay` y todo lo demás se deriva en memoria. Así el total reconcilia exacto con las filas por construcción y no hay ventana de carrera entre dos consultas.
- **Tercera copia de los `refine` del rango**: `.omit()` sobre un objeto con refinements lanza en Zod 4.4.3 (verificado), así que `taxQuerySchema` no puede derivarse de `revenueQuerySchema`. Cuando 017 mergee corresponde extraer un `refineDateRange()` y adoptarlo en los tres; no se hace acá para no editar en paralelo un archivo que 017 está escribiendo.
- **020 (Ganancias)** también consume `revenueScope` y `sumRevenueByDay`: nadie vuelve a definir "qué cuenta como venta".
