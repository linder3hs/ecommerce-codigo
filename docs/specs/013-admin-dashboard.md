---
id: 013
title: Dashboard admin con métricas en vivo
status: in-review
module: dashboard
scope: admin
---

# 013 — Dashboard admin con métricas en vivo

## Objetivo
Un usuario con `metrics.read` puede ver en `/admin/dashboard` ventas diarias, órdenes por
estado y productos con stock bajo, con refresco automático cada 30 s.

## Alcance
Incluye:
- Widget 1: ventas por día, últimos 30 días (`orders.status = 'paid'`), gráfico de línea.
- Widget 2: conteo de órdenes por `status` (`pending`/`paid`/`payment_failed`), barras.
- Widget 3: productos con `stock <= 5` activos, tabla de solo lectura.
- Polling con TanStack Query (`refetchInterval: 30_000`) y estados pending/error.
- Ítem "Dashboard" en `AdminSidebar`.

No incluye: restock ni edición de inventario · finanzas/márgenes · filtros o
paginación de órdenes · exportación CSV · redirección de `/admin` a dashboard ·
WebSockets/SSE · permiso nuevo (ver Notas).

## Criterios de aceptación
- [ ] AC1 — Dado un usuario con `metrics.read`, cuando entra a `/admin/dashboard`, entonces ve los 3 widgets con datos reales.
- [ ] AC2 — Dado un usuario con `panel.access` sin `metrics.read`, cuando entra a `/admin/dashboard`, entonces es redirigido a `/admin/categories`.
- [ ] AC3 — Dado un request a `GET /api/admin/dashboard` sin `metrics.read`, entonces responde 403; sin sesión, 401.
- [ ] AC4 — Dado un día del rango sin órdenes pagadas, cuando se dibuja la línea, entonces ese día aparece con valor 0 (30 puntos siempre).
- [ ] AC5 — Dado un `status` sin órdenes, entonces su barra aparece en 0 (los 3 estados siempre presentes).
- [ ] AC6 — Dado un producto con `stock <= 5` y `deleted_at` no nulo, entonces NO aparece en stock bajo.
- [ ] AC7 — Dado que la pestaña está abierta, cuando pasan 30 s, entonces los datos se refrescan sin recargar la página.
- [ ] AC8 — Durante la carga se muestran skeletons; ante error, mensaje con botón de reintento.

## Datos
Sin cambios de esquema. Sin migración. Sin permiso nuevo: se reutiliza
`metrics.read`, ya presente en `PERMISSIONS` y sembrado en `super_admin`, `admin`,
`manager` y `audit` (`src/server/db/seed.ts`).

Columnas leídas: `orders.status`, `orders.total_cents`, `orders.created_at` ·
`products.id`, `name`, `sku`, `stock`, `is_active`, `deleted_at`.
`order_items` no se usa en este spec.

## API
| Método | Ruta | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/api/admin/dashboard` | `requirePermission('metrics.read')` | — | `DashboardMetrics` |

Sin query params → no hay entrada que validar con Zod. La respuesta se describe con
Zod en `dashboard.schema.ts` y los tipos se infieren con `z.infer`; el service la
parsea (schema como única fuente de verdad del contrato, evita el tipo duplicado).

`dashboardMetricsSchema`: `salesByDay: { day: string /* YYYY-MM-DD */, totalCents: number }[]`,
`ordersByStatus: { status: 'pending'|'paid'|'payment_failed', total: number }[]`,
`lowStock: { id: string, name: string, sku: string, stock: number }[]`,
`windowDays: number`, `lowStockThreshold: number`.

## Reutilizar
- `src/lib/permissions.ts` — `PERMISSIONS.METRICS_READ`, `requirePermission`, `getEffectivePermissions`.
- `src/lib/api-error.ts` — `handleApiError` en el catch del handler.
- `src/lib/axios.ts` — instancia `api` para el service.
- `src/lib/format.ts` — `formatCents` para importes en pantalla.
- `src/modules/checkout/types/order.ts` — `OrderStatus` (`import type`, client-safe).
- `src/modules/audit/hooks/use-metrics.ts` + `services/metrics.service.ts` + `constants.ts` — plantilla exacta de hook/service/queryKeys.
- `src/app/(admin)/admin/audit-logs/page.tsx` — plantilla de Server Component shell con gate por permiso.
- `src/modules/audit/components/audit-metrics-summary.tsx` — plantilla de pending/error/skeleton.
- `src/components/shared/admin-sidebar.tsx` — `NAV_ITEMS` (icono `LayoutDashboard` de lucide).
- `src/components/ui/`: `card`, `table`, `skeleton`, `button`, `badge` ya instalados.
- Falta el wrapper de gráficos: `npx shadcn@latest add chart`.

## Tareas
- [x] T1 — Constantes del módulo (`dashboardKeys`, `SALES_WINDOW_DAYS = 30`, `LOW_STOCK_THRESHOLD = 5`, `LOW_STOCK_LIMIT = 20`, `REFETCH_INTERVAL_MS = 30_000`) · `src/modules/dashboard/constants.ts`
- [x] T2 — Repositorio con 3 funciones agregadas: `sumPaidTotalsByDay(since)`, `countOrdersByStatus()`, `findLowStockProducts(threshold, limit)` · `src/server/repositories/dashboard.repository.ts`
- [x] T3 — Test del repositorio (mismo patrón que `order.repository.test.ts`) · `src/server/repositories/dashboard.repository.test.ts`
- [x] T4 — Schema Zod de la respuesta + tipos inferidos · `src/modules/dashboard/schemas/dashboard.schema.ts`, `src/modules/dashboard/types/dashboard.ts`
- [x] T5 — Test del schema · `src/modules/dashboard/schemas/dashboard.schema.test.ts`
- [x] T6 — Helpers puros de relleno de series (30 días en cero, 3 estados en cero) · `src/modules/dashboard/lib/series.ts`
- [x] T7 — Test de los helpers · `src/modules/dashboard/lib/series.test.ts`
- [x] T8 — Route Handler GET con `requirePermission('metrics.read')` y `Promise.all` de las 3 consultas · `src/app/api/admin/dashboard/route.ts`
- [x] T9 — Service axios tipado · `src/modules/dashboard/services/dashboard.service.ts`
- [x] T10 — Test del service · `src/modules/dashboard/services/dashboard.service.test.ts`
- [x] T11 — Hook `useDashboardMetrics` con `refetchInterval` · `src/modules/dashboard/hooks/use-dashboard-metrics.ts`
- [x] T12 — Widget de ventas por día (línea) · `src/modules/dashboard/components/sales-by-day-chart.tsx`
- [x] T13 — Widget de órdenes por estado (barras) · `src/modules/dashboard/components/orders-by-status-chart.tsx`
- [x] T14 — Widget de stock bajo (tabla) · `src/modules/dashboard/components/low-stock-table.tsx`
- [x] T15 — Vista cliente que consume el hook una vez y reparte a los 3 widgets, con pending/error · `src/modules/dashboard/components/dashboard-view.tsx`
- [x] T16 — Página shell (Server Component, gate `metrics.read` → redirect `/admin/categories`) · `src/app/(admin)/admin/dashboard/page.tsx`
- [x] T17 — Ítem "Dashboard" en `NAV_ITEMS` con `requiredPermission: "metrics.read"` · `src/components/shared/admin-sidebar.tsx`

Verificación final: `npm run typecheck && npm run lint`

## Notas
- **Permiso.** El brief pedía `dashboard.view`; no se crea. `metrics.read` ya existe en
  el catálogo y en el seed, y un permiso nuevo obligaría a re-seed en Neon.
- `orders` no tiene `paid_at`: la agrupación por día usa `created_at`. `updated_at` se
  reescribe con `$onUpdate` y falsearía el histórico.
- La suma asume **una sola moneda** (`STRIPE_CURRENCY`): no se convierte nada ni se
  agrupa por `currency`.
- Drizzle: `sum()` devuelve `string | null` → castear a número en el repositorio.
  `count()` ya devuelve número.
- El agrupado por día debe producir claves `YYYY-MM-DD` en UTC, iguales a las que
  genera el helper de relleno, o el merge pierde puntos.
- Stock bajo filtra `deleted_at is null` además de `is_active = true` (borrado lógico),
  ordena `stock asc` y lleva `LIMIT`: lista sin techo es un riesgo real.
- `proxy.ts` ya cubre `/admin(.*)` con `createRouteMatcher`: `/admin/dashboard` entra sin
  tocar el archivo. Verificar, no editar.
- `/api/admin/metrics` (usuarios y auditoría) se mantiene aparte; no se fusiona.
- Verificar que `shadcn add chart` no intente bajar `recharts` a 2.x (instalado 3.10.1);
  si lo intenta, conservar 3.x y usar Recharts directo en los widgets.
- **Resultado real de `shadcn add chart`:** no bajó a 2.x, pero fijó `recharts` en
  `^3.8.0` y agregó una dependencia `cn@^0.3.0` (el `chart.tsx` generado importaba
  `cn` desde el paquete `cn`, no desde `@/lib/utils`). Se revirtieron las dos cosas:
  `package.json`/lockfile quedan sin cambios, `recharts` sigue en 3.10.1 y el import
  apunta a `@/lib/utils`. El wrapper de shadcn typechequea contra recharts 3.10.1, así
  que los widgets lo usan y no Recharts directo.
