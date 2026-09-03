---
id: 003
title: Integración Clerk + RBAC (Postgres/Drizzle)
status: done
module: auth
scope: both
---

# 003 — Integración Clerk + RBAC (Postgres/Drizzle)

Cierra la **Deuda 1** de `001-categories.md` y `002-products.md`. Hoy el login
(email/password + Google) funciona vía Clerk, pero es autenticación pura: no hay
autorización. Se ejecuta en 6 fases, cada una verificable de forma independiente.

Estado verificado del repo antes de escribir este spec:

- `src/middleware.ts` solo llama `clerkMiddleware()`, sin proteger ninguna ruta.
- `src/app/(admin)/admin/layout.tsx` no valida sesión ni rol.
- `src/server/db/schema/` solo tiene `category.ts` y `product.ts`. RBAC es greenfield,
  diseñado en `docs/DATA-MODEL.md` pero no implementado.
- `src/modules/{roles,audit,customers}/`, `src/app/api/admin/{roles,permissions,audit-logs,metrics}/`
  y `src/app/(auth)/sign-{in,up}/` son carpetas placeholder (`.gitkeep`) ya reservadas.
- `src/components/shared/admin-sidebar.tsx` tiene `NAV_ITEMS` fijo (Categorías, Productos),
  sin filtro por permiso.
- `DATABASE_URL` en `.env.local` **es endpoint pooled** (`-pooler`) → `{ prepare: false }`.

## Objetivo

Un usuario con rol asignado accede solo a lo que su rol permite: `/admin` protegido por
permiso explícito, endpoints mutantes gateados por `requirePermission`, y una sección de
administración de usuarios y roles usable por personas no técnicas.

## Alcance

Incluye: driver transaccional (`postgres-js`) · 6 tablas RBAC + `audit_logs` + migración ·
seed de 6 roles y 20 permisos · webhook Clerk→Postgres · `src/proxy.ts` · gate en el layout
de admin · sidebar filtrado por permiso · `/profile` de autogestión · retrofit de RBAC en
`/api/categories` y `/api/products` · módulos `roles`, `customers` (expuesto como "Usuarios")
y `audit` · métricas básicas.

No incluye: creación/edición/borrado de roles desde la UI (roles fijos `is_system=true`) ·
edición del catálogo de `permissions` desde la UI (es semilla) · módulo `orders` (sus dos
permisos se siembran, quedan inertes) · pantalla propia para el rol `audit` · organizaciones
de Clerk · purga por retención de `audit_logs` · tests (sin runner instalado).

## Decisiones confirmadas con el usuario

| Decisión | Detalle |
|---|---|
| Roles fijos | `super_admin`, `admin`, `manager`, `employee`, `customer`, `audit`. `is_system=true`, sembrados por `db:seed`, no creables ni editables desde UI. La UI solo asigna permisos a roles y roles a usuarios. |
| `super_admin` vs `admin` | Solo `super_admin` crea/edita usuarios `admin`/`super_admin` y modifica la matriz rol↔permiso. `admin` administra `manager/employee/customer/audit` y opera catálogo, pero no toca permisos. |
| `audit` | Solo lectura de `audit_logs` y métricas. Cero escritura en cualquier módulo. |
| Un solo módulo "Usuarios" | Reutiliza `src/modules/customers/` y `/admin/customers`, expuesto como "Usuarios" en el sidebar. Lista staff y compradores con su rol. |
| Acceso a `/admin` | Solo `super_admin`, `admin`, `manager`, vía permiso explícito `panel.access`. `employee`, `audit` y `customer` van a `/profile`. **Nunca** se compara `role.slug` en código. |
| Next.js 16 | `middleware.ts` se renombró a `proxy.ts` (función exportada `proxy`, runtime Node.js fijo). Confirmado en `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`. Se **renombra** el archivo actual, no se crea uno al lado. |

### Hallazgo bloqueante que reordena el trabajo

`src/server/db/index.ts` usa `drizzle-orm/neon-http`, que **no soporta `db.transaction()`**
(fetch-based). La regla dura #9 (`audit_logs` en la misma transacción que la mutación) es
imposible sin cambiar de driver. Se migra a `drizzle-orm/postgres-js` (paquete `postgres`,
ya cubierto por `drizzle-orm@0.45.2`) en `src/server/db/index.ts` **y** en
`src/server/db/seed.ts` (tiene cliente Drizzle propio porque `index.ts` es `server-only`).

### Autorización en 3 capas (no 2)

1. **`src/proxy.ts`** — solo gate de autenticación (¿hay sesión?) con `createRouteMatcher`. Cero consultas a BD en el borde.
2. **`(admin)/admin/layout.tsx`** — gate de autorización: resuelve permisos efectivos una vez por navegación, redirige sin `panel.access`, y los pasa al sidebar.
3. **Route Handler** — `requirePermission('<recurso>.<acción>')`, la capa que manda (regla dura #8).

## Catálogo de permisos (semilla)

`code` = `<resource>.<action>`, 20 permisos (recuento exacto de la tabla de abajo: panel 1 +
categories 4 + products 4 + orders 2 + users 5 + roles 2 + audit_logs 1 + metrics 1 = 20):

| Resource | Actions |
|---|---|
| `panel` | `access` (llave de entrada a `/admin`) |
| `categories` | `create`, `read`, `update`, `delete` |
| `products` | `create`, `read`, `update`, `delete` |
| `orders` | `read`, `update_status` (reservado, sin módulo aún) |
| `users` | `read`, `create`, `update`, `deactivate`, `assign_privileged_role` |
| `roles` | `read`, `manage_permissions` |
| `audit_logs` | `read` |
| `metrics` | `read` |

Matriz rol → permisos:

| Rol | Permisos | ¿Entra a `/admin`? |
|---|---|---|
| `super_admin` | Todos los existentes en `permissions` en tiempo de seed (no lista hardcodeada). | Sí |
| `admin` | Todos menos `users.assign_privileged_role` y `roles.manage_permissions`. | Sí |
| `manager` | `panel.access`, `categories.read/update`, `products.read/update`, `orders.read/update_status`, `metrics.read`. | Sí |
| `employee` | `categories.read`, `products.read/update`, `orders.read/update_status`. | No → `/profile` |
| `audit` | `audit_logs.read`, `metrics.read`. | No → `/profile` |
| `customer` | Ninguno (autoriza por propiedad del recurso). | No → `/profile` |

Usuario sin filas en `user_roles` = `customer` por defecto. Ese default vive en un solo
lugar del servidor: `getEffectivePermissions()`.

## Datos

**Requiere migración** (`0002_*.sql`). 6 tablas nuevas en `src/server/db/schema/`, columnas
según `docs/DATA-MODEL.md §1 y §2`:

| Archivo | Tabla | Claves |
|---|---|---|
| `user.ts` | `users` | `id` uuid PK · `clerk_id` varchar único · `email` · `first_name`/`last_name` · `image_url` · `is_active` bool default true · `created_at`/`updated_at` |
| `role.ts` | `roles` | `id` uuid PK · `slug` varchar único · `name` · `description` · `is_system` bool default false |
| `permission.ts` | `permissions` | `id` uuid PK · `code` varchar único (`<resource>.<action>`) · `resource` · `action` · `description` (en español, es lo que ve la UI) |
| `role-permission.ts` | `role_permissions` | PK compuesta (`role_id`, `permission_id`), ambas FK `ON DELETE CASCADE` |
| `user-role.ts` | `user_roles` | PK compuesta (`user_id`, `role_id`) · `assigned_by` FK `users.id` nullable · `assigned_at` |
| `audit-log.ts` | `audit_logs` | `id` uuid PK · `actor_id` FK `users.id` nullable · `action` text · `entity_type` text · `entity_id` text null · `changes` jsonb null · `metadata` jsonb null · `ip_address` inet null · `user_agent` text null · `severity` `pgEnum('audit_severity', ['info','warning','error'])` · `created_at` |

Índices de `audit_logs`: `(entity_type, entity_id)` · `(actor_id, created_at DESC)` ·
`(action)` · `(created_at DESC)`.

Tipos con `InferSelectModel` e **`import type`**, como en `types/category.ts`.

## API

Mismo envelope `{ message, issues? }` de `src/lib/api-error.ts`.

| Método | Ruta | Permiso | Body | Response |
|---|---|---|---|---|
| POST | `/api/webhooks/clerk` | público (firma Svix) | evento Clerk | 200 · 400 |
| GET | `/api/admin/roles` | `roles.read` | — | `RoleWithPermissions[]` · 401, 403 |
| GET | `/api/admin/permissions` | `roles.read` | — | `Permission[]` · 401, 403 |
| PATCH | `/api/admin/roles/[id]/permissions` | `roles.manage_permissions` | `{ permissionIds: string[] }` | `RoleWithPermissions` · 400, 401, 403, 404 |
| GET | `/api/admin/customers` | `users.read` | query | `{ data: UserListItem[], meta: PageMeta }` |
| POST | `/api/admin/customers` | `users.create` | `InviteUserInput` | 201 · 400, 401, 403 |
| PATCH | `/api/admin/customers/[id]/role` | `users.update` (+ `users.assign_privileged_role` si el objetivo es admin/super_admin) | `{ roleId }` | `UserListItem` · 400, 401, 403, 404 |
| PATCH | `/api/admin/customers/[id]/status` | `users.deactivate` | `{ isActive }` | `UserListItem` · 400, 401, 403, 404 |
| GET | `/api/admin/audit-logs` | `audit_logs.read` | query (`entityType`, `action`, `actorId`, `dateFrom`, `dateTo`, page) | `{ data: AuditLogListItem[], meta: PageMeta }` |
| GET | `/api/admin/metrics` | `metrics.read` | — | `MetricsSummary` |

`PATCH /api/admin/roles/[id]/permissions` es **reemplazo total** del set, transaccional,
con `logAudit` en la misma transacción.

Retrofit sobre los endpoints existentes: se gatean solo los verbos mutantes.
`POST/PATCH/DELETE /api/categories[/[id]]` → `categories.create|update|delete`.
`POST/PATCH/DELETE /api/products[/[id]]` → `products.create|update|delete`.
Los `GET` quedan públicos: los necesita el storefront.

Schemas Zod (mensajes en español): `updateRolePermissionsSchema`, `inviteUserSchema`,
`updateUserRoleSchema`, `updateUserStatusSchema`, `userQuerySchema`, `auditLogQuerySchema`.
`[id]` se tipa con `RouteContext<'/api/...'>` y `ctx.params` requiere `await` (Next 16).

## Reutilizar

Tal cual, sin reescribir:

- `src/lib/api-error.ts` — `jsonError`, `handleApiError`, `NotFoundError`, `isUniqueViolation`
  (se **extiende** con `UnauthorizedError` → 401 y `ForbiddenError` → 403; no se reescribe).
- `src/lib/axios.ts` (`api`) · `src/lib/utils.ts` (`cn`, `slugify`) · `src/types/api.ts` (`PageMeta`)
  · `src/hooks/use-debounce.ts` · `src/lib/format.ts`.
- `src/components/ui/`: `table`, `dialog`, `alert-dialog`, `field`, `input`, `select`, `switch`,
  `badge`, `skeleton`, `dropdown-menu`, `button`, `sonner`, `card`, `tabs`, `avatar`, `separator`.
- `src/server/repositories/category.repository.ts` — patrón de repositorio a replicar.
- `src/app/(admin)/admin/layout.tsx` y `src/components/shared/admin-sidebar.tsx` — se **modifican**, no se recrean.
- Patrón de módulo a copiar archivo por archivo de `src/modules/products/` (que ya copió a
  `categories/`): `constants.ts` con query keys, `*-columns.tsx` con `tableFeatures` y `columns`
  en ámbito de módulo, tabla presentacional separada del contenedor `*-view.tsx` (`"use client"`),
  `*-row-actions.tsx` con diálogos propios, formulario con primitivas `Field` + RHF + `zodResolver`
  (**no** el componente `form` de shadcn).
- `ClerkProvider` ya montado en `src/app/layout.tsx` con `appearance={{ theme: shadcn }}`: solo se
  le añade `localization`.

Nuevas dependencias: `npm i postgres @clerk/localizations`.
Nuevo componente shadcn: `npx shadcn@latest add checkbox` (único que falta).

## Tareas

### Fase 1 — Driver transaccional, schema RBAC, seed y repositorios

- [x] T1 — Instalar `postgres` y migrar el cliente a `drizzle-orm/postgres-js` con `{ prepare: false }` (DATABASE_URL es pooled) · `src/server/db/index.ts`
- [x] T2 — Migrar el cliente propio del seed al mismo driver · `src/server/db/seed.ts`
- [x] T3 — Tabla `users` · `src/server/db/schema/user.ts`
- [x] T4 — Tabla `roles` · `src/server/db/schema/role.ts`
- [x] T5 — Tabla `permissions` · `src/server/db/schema/permission.ts`
- [x] T6 — Pivote `role_permissions` (PK compuesta) · `src/server/db/schema/role-permission.ts`
- [x] T7 — Pivote `user_roles` (PK compuesta, `assigned_by`) · `src/server/db/schema/user-role.ts`
- [x] T8 — Tabla `audit_logs` con `pgEnum` de severidad y los 4 índices · `src/server/db/schema/audit-log.ts`
- [x] T9 — Re-exportar las 6 tablas · `src/server/db/schema/index.ts`
- [x] T10 — Generar y aplicar migración `0002_*.sql` · `npm run db:generate && npm run db:migrate`
- [x] T11 — Repositorio de usuarios (upsert por `clerkId`, findByClerkId, list paginado, setActive) · `src/server/repositories/user.repository.ts`
- [x] T12 — Repositorio de roles (list con permisos, findById, replacePermissions, assignToUser) · `src/server/repositories/role.repository.ts`
- [x] T13 — Repositorio de permisos (listAll, findByCodes) · `src/server/repositories/permission.repository.ts`
- [x] T14 — Repositorio de auditoría (append-only: `create` + `list` con filtros; sin update ni delete) · `src/server/repositories/audit.repository.ts`
- [x] T15 — Todos los repositorios nuevos aceptan cliente Drizzle opcional (`db: Db | Tx = getDb()`) para componerse dentro de transacciones
- [x] T16 — Seed idempotente de 6 roles + 20 permisos + `role_permissions` según la matriz · `src/server/db/seed.ts`

Hecho cuando: `db:generate` produce un `0002_*.sql` limpio, `db:migrate` aplica contra Neon,
`db:seed` corre dos veces sin duplicar, y un script con `db.transaction()` + rollback forzado
confirma que el driver soporta transacciones reales.

### Fase 2 — Sincronización Clerk↔Postgres y libs de servidor (depende de F1)

- [x] T17 — Webhook con `verifyWebhook()` (incluido en `@clerk/nextjs@7.8.2`); `user.created/updated/deleted` como upsert idempotente por `clerkId` · `src/app/api/webhooks/clerk/route.ts`
- [x] T18 — `requireAuth()` y `getCurrentAppUser()` · `src/lib/auth.ts`
- [x] T19 — `PERMISSIONS`, `getEffectivePermissions(clerkId)` (una sola query con joins), `requirePermission(code)`, `assertCanManageTargetUser(...)` · `src/lib/permissions.ts`
- [x] T20 — `logAudit(tx, entry)` transaccional, con enmascarado de campos sensibles · `src/lib/audit.ts`
- [x] T21 — `UnauthorizedError` (401) y `ForbiddenError` (403) + ramas en `handleApiError` · `src/lib/api-error.ts`
- [x] T22 — `CLERK_WEBHOOK_SIGNING_SECRET` · `.env.example` y `.env.local`

Hecho cuando: crear/editar/borrar un usuario en Clerk produce o actualiza su fila en `users`;
reenviar el mismo evento no duplica; un usuario nuevo sin `user_roles` da un set de permisos vacío.

### Fase 3 — Protección de rutas, perfil de autogestión y retrofit (depende de F1–F2)

- [x] T23 — **Renombrar** `src/middleware.ts` → `src/proxy.ts`, función exportada `proxy`; `createRouteMatcher` público/protegido/admin, solo autenticación; `/api/webhooks/clerk` público
- [x] T24 — Gate de autorización: resuelve `getEffectivePermissions()`, `redirect('/profile')` sin `panel.access` y `/sign-in` sin sesión; pasa permisos al sidebar · `src/app/(admin)/admin/layout.tsx`
- [x] T25 — `NAV_ITEMS` gana `requiredPermission` y se filtra con los permisos recibidos por prop · `src/components/shared/admin-sidebar.tsx`
- [x] T26 — Vista de autogestión para cualquier autenticado: Server Component que lee el rol propio del repositorio y embebe `<UserProfile/>` de Clerk, con badge de rol solo lectura · `src/app/(storefront)/profile/page.tsx`
- [x] T27 — Mover las páginas reales de `src/app/sign-in`/`sign-up` al route group `(auth)` ya reservado (la URL no cambia) y borrar las carpetas viejas
- [x] T28 — `localization={esES}` de `@clerk/localizations` en `ClerkProvider` · `src/app/layout.tsx`
- [x] T29 — `requirePermission('categories.create|update|delete')` en POST/PATCH/DELETE · `src/app/api/categories/route.ts` y `src/app/api/categories/[id]/route.ts`
- [x] T30 — `requirePermission('products.create|update|delete')` en POST/PATCH/DELETE · `src/app/api/products/route.ts` y `src/app/api/products/[id]/route.ts`

Hecho cuando: no-autenticado a `/admin/*` → sign-in; autenticado sin `panel.access` → `/profile`;
`super_admin`/`admin`/`manager` entran normal; `/profile` accesible a cualquier autenticado;
`POST /api/categories` sin permiso → 403; UI de auth en español; sin `middleware.ts` residual.

### Fase 4 — Módulo `roles`: matriz rol↔permiso (depende de F1–F3)

- [x] T31 — Instalar `npx shadcn@latest add checkbox`
- [x] T32 — `GET /api/admin/roles` con sus permisos · `src/app/api/admin/roles/route.ts`
- [x] T33 — `GET /api/admin/permissions` · `src/app/api/admin/permissions/route.ts`
- [x] T34 — `PATCH /api/admin/roles/[id]/permissions`: reemplazo total, transaccional, con `logAudit` · `src/app/api/admin/roles/[id]/permissions/route.ts`
- [x] T35 — Guardarraíl: 400 si el payload quita `roles.manage_permissions`, `users.assign_privileged_role` o `panel.access` al rol `super_admin` (invariante de registro, no autorización por rol — sin `panel.access` nadie podría volver a entrar a `/admin` a corregirlo) · mismo handler
- [x] T36 — Tipos, schemas Zod y `constants.ts` con query keys · `src/modules/roles/{types,schemas}/` + `src/modules/roles/constants.ts`
- [x] T37 — Service axios y hooks (`useRoles`, `usePermissions`, `useUpdateRolePermissions`) · `src/modules/roles/{services,hooks}/`
- [x] T38 — Matriz agrupada por `resource`, mostrando `description` en español y nunca el `code` crudo; solo-lectura sin `roles.manage_permissions` · `src/modules/roles/components/`
- [x] T39 — Página server component · `src/app/(admin)/admin/roles/page.tsx`

Hecho cuando: `admin` ve la matriz en solo-lectura; `super_admin` edita y guarda; quitarle la
llave a `super_admin` devuelve 400; cada guardado deja fila en `audit_logs`.

### Fase 5 — Módulo "Usuarios": invitar, asignar rol, activar/desactivar (depende de F1–F4)

- [x] T40 — **Spike previo**: confirmar que `publicMetadata` de una Clerk Invitation se propaga al usuario tras aceptar. Si no, plan B documentado: tabla `pending_invitations(email, intended_role_slug)`
- [x] T41 — `GET /api/admin/customers` paginado con rol resuelto por join (sin N+1) · `src/app/api/admin/customers/route.ts`
- [x] T42 — `POST /api/admin/customers`: invitación vía Clerk Invitations (**no** `createUser`), rol intencionado en `publicMetadata` · mismo archivo
- [x] T43 — `PATCH /api/admin/customers/[id]/role` con `assertCanManageTargetUser`, transaccional + `logAudit` · `src/app/api/admin/customers/[id]/role/route.ts`
- [x] T44 — `PATCH /api/admin/customers/[id]/status`, transaccional + `logAudit` · `src/app/api/admin/customers/[id]/status/route.ts`
- [x] T45 — Tipos, schemas Zod y `constants.ts` · `src/modules/customers/{types,schemas}/` + `src/modules/customers/constants.ts`
- [x] T46 — Service axios y hooks · `src/modules/customers/{services,hooks}/`
- [x] T47 — Tabla, toolbar, diálogo de invitación y acciones de fila · `src/modules/customers/components/`
- [x] T48 — Página server component · `src/app/(admin)/admin/customers/page.tsx`
- [x] T49 — Entradas "Usuarios" (`users.read`) y "Roles y permisos" (`roles.read`) · `src/components/shared/admin-sidebar.tsx`

Hecho cuando: `admin` invita/edita `manager/employee/customer/audit` pero recibe 403 al tocar
`admin`/`super_admin`; `super_admin` puede todo; el sidebar es permission-aware; cada cambio
deja rastro en `audit_logs`.

### Fase 6 — Auditoría de solo lectura y métricas (depende de F1–F2; verificable con datos de F4–F5)

- [x] T50 — `GET /api/admin/audit-logs` con filtros `entityType/action/actorId/dateFrom/dateTo` — **solo GET** · `src/app/api/admin/audit-logs/route.ts`
- [x] T51 — `GET /api/admin/metrics` · `src/app/api/admin/metrics/route.ts`
- [x] T52 — Tipos, schemas y `constants.ts` · `src/modules/audit/{types,schemas}/` + `src/modules/audit/constants.ts`
- [x] T53 — Service axios y hooks · `src/modules/audit/{services,hooks}/`
- [x] T54 — Tabla con filtros y detalle `before/after` · `src/modules/audit/components/`
- [x] T55 — Página server component · `src/app/(admin)/admin/audit-logs/page.tsx`
- [x] T56 — Entrada "Auditoría" (`audit_logs.read`) · `src/components/shared/admin-sidebar.tsx`

Hecho cuando: `super_admin`/`admin` ven auditoría y métricas; sin permiso → 403; los cambios de
F4–F5 aparecen con `before/after` y sin PII.

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer).

## Notas

1. **`neon-http` sin transacciones** — resuelto en Fase 1 migrando a `postgres-js`. Sin esto, la regla dura #9 es inejecutable.
2. **`DATABASE_URL` es pooled** (`-pooler` verificado en `.env.local`) → la conexión `postgres-js` necesita `{ prepare: false }`.
3. **`seed.ts` tiene cliente Drizzle propio** (porque `db/index.ts` es `server-only`): el cambio de driver hay que replicarlo ahí o el seed rompe.
4. **El proxy no consulta Postgres.** Autenticación en el borde, autorización en layout y handler. Meter una query de permisos en `proxy.ts` es hallazgo bloqueante.
5. **Invitar usuario no puede ser atómico**: la invitación es un efecto externo en Clerk y `audit_logs` es local. Se acepta consistencia eventual solo en ese punto; todo lo demás va en transacción.
6. **Webhooks Svix son at-least-once y sin orden garantizado** → siempre upsert idempotente por `clerkId`, nunca `insert` a secas.
7. **N+1 en `getEffectivePermissions()`** — una sola query con joins `users → user_roles → role_permissions → permissions`, resuelta una vez por navegación en el layout.
8. **El guardarraíl de `super_admin` es invariante de registro, no autorización por rol.** Se valida la forma del payload (incluye `panel.access`, no solo `roles.manage_permissions`/`users.assign_privileged_role`), no quién lo envía; la autorización sigue siendo `requirePermission('roles.manage_permissions')`.
9. **`/api/categories` y `/api/products` viven fuera de `/api/admin/*`** — excepción de nomenclatura consciente: el storefront necesita sus `GET`. La regla #8 se aplica en espíritu gateando solo los verbos mutantes.
10. **`panel.access` es la llave del panel**, no "set de permisos no vacío": `employee` y `audit` tienen permisos y aun así no entran.
11. **Renombrado, no duplicado**: si quedan `middleware.ts` y `proxy.ts` a la vez, hay dos capas de auth compitiendo.

## Notas del spec — inconsistencias del plan, señaladas sin resolver

Detectadas al formalizar. **No** se decidieron aquí: requieren respuesta del usuario en la
aprobación o quedan como deuda explícita.

1. **El rol `audit` no tiene pantalla.** Tiene `audit_logs.read` y `metrics.read` pero no `panel.access`, y la única UI de auditoría vive bajo `/admin`. En la práctica sus dos permisos son inertes en esta entrega: solo `super_admin` y `admin` verán la sección. El plan lo reconoce ("permiso reservado a futuro") pero el resultado es un rol sin utilidad hasta un spec posterior.
2. ~~**`super_admin` puede autoexcluirse del panel.**~~ **Resuelto antes de aprobar**: T35 ahora también protege `panel.access` en el guardarraíl de `super_admin`.
3. **Divergencia módulo↔permiso**: la ruta y el módulo se llaman `customers` (carpetas ya reservadas), pero el recurso de permisos es `users.*` y la etiqueta de UI es "Usuarios". Tres nombres para lo mismo. Se mantiene porque las carpetas ya existen; conviene decidir si se renombra a `users` antes de escribir código, no después.
4. **Fase 6 declara depender solo de F1–F2**, pero su criterio de "hecho" exige registros generados por F4–F5. Es implementable antes, verificable después.
5. **`orders.read` y `orders.update_status` se siembran sin módulo `orders`**: dos permisos muertos hasta su spec. Igual pasa con `categories.read` y `products.read`, que no gatean nada porque los `GET` son públicos: solo sirven para filtrar el sidebar.
6. **Este spec excede el presupuesto de 120 líneas del agente `spec`.** Seis fases son, en rigor, seis specs (`003`…`008`). Se mantiene en un archivo porque el plan aprobado lo pide, pero cada fase tiene criterio de "hecho" propio y puede aprobarse e implementarse por separado — recomendado, sobre todo el corte tras Fase 3.

## Deuda que este spec cierra

- Deuda 1 de `001-categories.md` y de `002-products.md` (sin auth ni autorización): cerrada en Fase 3.

## Deuda que este spec abre

1. Sin purga por retención de `audit_logs` (180 días para `info`, indefinida para `auth.*`/`role.*` según `docs/DATA-MODEL.md`): requiere un job, no cabe en un request.
2. Sin caché del set de permisos: se resuelve por navegación y por request mutante. Con volumen, evaluar `publicMetadata` de Clerk como caché derivada — ante discrepancia gana Postgres.
3. Sin UI de restauración de usuarios desactivados más allá del toggle de estado.
4. Sin tests (no hay runner instalado) — la verificación de las 6 fases es manual.
5. Un actor con `users.deactivate` puede desactivarse a sí mismo. No es tan grave como el auto-bloqueo de `panel.access` de T35 (recuperable por cualquier otro actor con `users.deactivate`, o por DB directa), pero es el mismo tipo de invariante de registro sin resolver. Fuera de alcance de Fase 5; si se decide cerrar, va en `PATCH /api/admin/customers/[id]/status` como un chequeo `targetUserId !== actorUserId`.
