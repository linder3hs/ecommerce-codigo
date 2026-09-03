---
id: 001
title: CRUD de categorías (admin)
status: done
module: categories
scope: admin
created: 2026-08-28
---

# 001 — CRUD de categorías (admin)

## 1. Contexto

El repositorio es un scaffold: no existe ninguna tabla Drizzle, repositorio, Route
Handler, service, hook ni pantalla de administración. `src/server/db/schema/index.ts`
es un barrel vacío (`export {};`) y `src/server/repositories/` solo contiene `.gitkeep`.

`categories` es la raíz de la taxonomía del catálogo: según `docs/SETUP.md` §5.3 la
relación es `categories` 1—N `products`. Sin categorías no se puede dar de alta un
producto, por lo que esta es la Fase 1 de un plan de dos fases (Fase 2: productos,
spec aparte).

Además de la funcionalidad, esta feature fija los **patrones de referencia** que
Fase 2 copiará: forma del schema Drizzle, contrato paginado de la API, capa de
repositorio, envelope de error compatible con el interceptor de `src/lib/axios.ts`
y la tabla de administración con TanStack Table v9.

## 2. Objetivo

Un administrador puede crear, listar, buscar, filtrar, editar y eliminar categorías
desde `/admin/categories`, sobre datos persistidos en Neon, para poder clasificar
el catálogo de productos en la Fase 2.

## 3. Alcance

### Incluye

- Tabla `categories` en Postgres vía Drizzle + migración generada y aplicada.
- CRUD completo en `/api/categories` y `/api/categories/[id]` con validación Zod
  en cada handler.
- Repositorio `category.repository.ts` como única capa que consulta la BD.
- Service axios + hooks TanStack Query del módulo `categories`.
- Pantalla `/admin/categories` con TanStack Table v9: paginación, ordenamiento,
  filtro por estado (activo/inactivo) y buscador por nombre/slug — todo resuelto
  en servidor.
- Layout mínimo de administración (`(admin)/admin/layout.tsx`) con sidebar simple,
  **sin guard de rol**.
- Estados de carga (skeleton), error, y vacío en el listado; estados de carga y
  error en el formulario de alta/edición.
- Seed de categorías de ejemplo en `src/server/db/seed.ts`.
- Componentes shadcn faltantes: `alert-dialog`, `textarea`, `switch`.

### No incluye (explícito)

- **Autenticación y autorización.** Sin `requirePermission()`, sin `logAudit()`,
  sin protección en `middleware.ts`. Decisión explícita del usuario — ver §11.
- Cualquier cosa de `products`: schema, FK, API, UI. Va en el spec 002.
- Storefront: las categorías no se exponen todavía en `(storefront)`.
- Subida de imágenes. `image_url` es un campo de texto con una URL; no hay uploader.
- Subcategorías / jerarquía (`parent_id`), orden manual de visualización
  (`sort_order`), traducciones, SEO meta por categoría.
- Página `/admin` (dashboard). El sidebar solo enlaza a Categorías en esta fase.
- Tests automatizados (no hay runner de tests instalado en el proyecto).

## 4. Criterios de aceptación

- [x] **AC1** — Dado que la migración se aplicó, cuando consulto Neon, entonces
      existe la tabla `categories` con las columnas de §5 y un índice único parcial
      sobre `slug` restringido a filas no borradas.
- [x] **AC2** — Dado un `name` válido y sin `slug`, cuando hago `POST /api/categories`,
      entonces se crea la categoría con un `slug` derivado del nombre (minúsculas,
      sin acentos, separado por guiones) y responde `201` con la fila creada.
- [x] **AC3** — Dado un `slug` ya usado por una categoría no borrada, cuando hago
      `POST /api/categories` o `PATCH /api/categories/[id]`, entonces responde `409`
      con `{ "message": "Ya existe una categoría con ese slug." }`.
- [x] **AC4** — Dado un body que no cumple el schema Zod, cuando llamo a cualquier
      handler de escritura, entonces responde `400` y **no** se ejecuta ninguna
      consulta a la base de datos.
- [x] **AC5** — Dado `GET /api/categories?page=2&pageSize=5`, entonces responde
      `{ data, meta: { page, pageSize, total, totalPages } }` con como máximo 5 filas
      y `total` = total de categorías no borradas que cumplen los filtros.
- [x] **AC6** — Dado `GET /api/categories?search=tecl`, entonces devuelve solo las
      categorías cuyo `name` **o** `slug` contiene "tecl" sin distinguir mayúsculas.
- [x] **AC7** — Dado `GET /api/categories?isActive=false`, entonces devuelve solo
      categorías con `is_active = false`; sin el parámetro devuelve ambas.
- [x] **AC8** — Dado `DELETE /api/categories/[id]` sobre una categoría existente,
      entonces responde `204`, la fila conserva sus datos con `deleted_at` no nulo,
      y deja de aparecer en `GET /api/categories`.
- [x] **AC9** — Dado un `id` inexistente o ya borrado, cuando llamo `GET`, `PATCH`
      o `DELETE` de `/api/categories/[id]`, entonces responde `404`.
- [x] **AC10** — Dado que entro a `/admin/categories` con la query en vuelo, entonces
      veo un skeleton de tabla; si la query falla veo un estado de error con botón
      "Reintentar"; si no hay resultados veo un estado vacío con copy en español.
- [x] **AC11** — Dado que escribo en el buscador, entonces la petición se dispara
      con debounce (400 ms), la paginación vuelve a la página 1 y la URL del
      componente no se recarga.
- [x] **AC12** — Dado que hago clic en "Nueva categoría" y envío el formulario
      válido, entonces se cierra el diálogo, aparece un toast de éxito y la tabla
      se refresca sin recarga completa de página.
- [x] **AC13** — Dado que el POST devuelve `409`, entonces el diálogo permanece
      abierto y muestra el mensaje de error del servidor, sin perder lo escrito.
- [x] **AC14** — Dado que uso "Eliminar" en el menú de fila, entonces se abre un
      `AlertDialog` de confirmación y solo al confirmar se ejecuta el `DELETE`.
- [x] **AC15** — Dado el código completo, entonces todo identificador (tablas,
      columnas, variables, componentes, archivos) está en inglés y todo texto
      visible en la UI está en español.
- [x] **AC16** — `npm run typecheck && npm run lint && npm run build` en verde.

## 5. Modelo de datos

Tabla **nueva**: `categories`. Requiere migración (`db:generate` + `db:migrate`).

| Columna | Tipo | Nulo | Default | Justificación |
|---|---|---|---|---|
| `id` | `uuid` PK | no | `gen_random_uuid()` | Coherente con `audit_logs` en `docs/SETUP.md` §5.2, que ya usa `uuid PK`. Evita exponer conteo de filas y no obliga a coordinar secuencias al sembrar. |
| `name` | `varchar(120)` | no | — | Nombre visible. Longitud acotada para que el `Input` y la columna de la tabla tengan un límite predecible. |
| `slug` | `varchar(140)` | no | — | Identificador de URL para el storefront de Fase 2. Único entre filas vivas (índice parcial). |
| `description` | `text` | sí | — | Texto libre opcional para la cabecera de la categoría. |
| `image_url` | `text` | sí | — | URL absoluta de imagen de portada. `text` porque no hay límite fiable de longitud de URL. |
| `is_active` | `boolean` | no | `true` | Interruptor de **publicación**, reversible desde la UI. Es la columna que alimenta el filtro por estado. |
| `deleted_at` | `timestamptz` | sí | — | Marca de **soft delete**. Distinta de `is_active`: ver §8. |
| `created_at` | `timestamptz` | no | `now()` | Orden por defecto del listado. |
| `updated_at` | `timestamptz` | no | `now()` | Se actualiza vía `$onUpdate()` de Drizzle (verificado disponible en `drizzle-orm@0.45`). |

Índices:

| Nombre | Definición | Para qué |
|---|---|---|
| `categories_slug_active_unq` | `UNIQUE (slug) WHERE deleted_at IS NULL` | Garantiza slug único entre categorías vivas y permite reutilizar el slug de una categoría borrada. |
| `categories_created_at_idx` | `(created_at DESC)` | Orden por defecto del listado paginado. |

```ts
// src/server/db/schema/category.ts — firma propuesta
import { sql } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  // drizzle-orm 0.45: el callback de extraConfig devuelve un ARRAY, no un objeto.
  (table) => [
    uniqueIndex("categories_slug_active_unq")
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    index("categories_created_at_idx").on(table.createdAt.desc()),
  ],
);
```

Tipos derivados (nunca escritos a mano, CLAUDE.md §4.5):

```ts
// src/modules/categories/types/category.ts
import type { InferSelectModel } from "drizzle-orm";
import type { categories } from "@/server/db/schema/category";

export type Category = InferSelectModel<typeof categories>;
```

> `import type` es obligatorio aquí: se borra en compilación, así que el bundle de
> cliente no arrastra `drizzle-orm` y no se viola la regla dura 1 de CLAUDE.md.
> El archivo `src/server/db/schema/category.ts` **no** debe importar `server-only`
> (solo `src/server/db/index.ts` lo hace, ya verificado).

`src/server/db/schema/index.ts` pasa de `export {};` a `export * from "./category";`.

## 6. Contratos de API

Envelope de error fijo: **`{ "message": string, "issues"?: Array<{ path: string; message: string }> }`**.
No es negociable: `src/lib/axios.ts` ya tiene un interceptor que lee
`error.response.data.message` para construir el `Error` que llega al hook.

| Método | Ruta | Auth | Request | Response | Errores |
|---|---|---|---|---|---|
| GET | `/api/categories` | **pública (sin auth en esta fase)** | query string | `{ data: Category[], meta: PageMeta }` | 400, 500 |
| POST | `/api/categories` | **pública (sin auth en esta fase)** | `CreateCategoryInput` | `Category` (201) | 400, 409, 500 |
| GET | `/api/categories/[id]` | **pública (sin auth en esta fase)** | — | `Category` | 400, 404, 500 |
| PATCH | `/api/categories/[id]` | **pública (sin auth en esta fase)** | `UpdateCategoryInput` | `Category` | 400, 404, 409, 500 |
| DELETE | `/api/categories/[id]` | **pública (sin auth en esta fase)** | — | `204 No Content` | 400, 404, 500 |

Los Route Handlers no se cachean por defecto en Next 16 (verificado en
`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`:
*"Route Handlers are not cached by default"*), y Cache Components no está activado
en `next.config.ts`. No se declara ningún `export const dynamic`.

`[id]` se tipa con el helper global `RouteContext<'/api/categories/[id]'>`
(`ctx.params` es una Promise en Next 16; hay que hacer `await`).

### Schemas Zod (`src/modules/categories/schemas/category.schema.ts`)

Zod v4 (`4.4.3`): usar validadores de nivel superior `z.uuid()` / `z.url()`,
no los métodos encadenados deprecados.

```ts
export const categoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
  isActive: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
  sortBy: z.enum(["name", "createdAt", "updatedAt"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  description: z.string().trim().max(1000).nullish(),
  imageUrl: z.url().max(2048).nullish(),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryIdSchema = z.uuid();
```

Mensajes de error de Zod redactados **en español** (son los que ve el usuario en el
formulario). El mapeo `ZodError → 400` se hace con `error.issues`, no con
`.flatten()` (deprecado en Zod v4).

`PageMeta = { page: number; pageSize: number; total: number; totalPages: number }`.

## 7. Arquitectura y archivos afectados

Mapa capa por capa según `docs/SETUP.md` §3. Todos los archivos son **nuevos**
salvo los marcados como modificados.

| Capa | Archivo | Rol |
|---|---|---|
| shadcn | `src/components/ui/{alert-dialog,textarea,switch}.tsx` | generados por CLI |
| lib | `src/lib/utils.ts` *(modificado)* | `slugify()` |
| lib | `src/lib/api-error.ts` | `jsonError()`, `handleApiError()`, `NotFoundError`, `SlugConflictError` |
| hooks | `src/hooks/use-debounce.ts` | debounce del buscador (nombrado en SETUP.md §3) |
| schema | `src/server/db/schema/category.ts` | tabla `categories` |
| schema | `src/server/db/schema/index.ts` *(modificado)* | re-export del barrel |
| migración | `drizzle/*.sql` | generada por `db:generate` |
| seed | `src/server/db/seed.ts` *(modificado)* | categorías de ejemplo |
| repositorio | `src/server/repositories/category.repository.ts` | única capa con Drizzle |
| API | `src/app/api/categories/route.ts` | GET (list) · POST |
| API | `src/app/api/categories/[id]/route.ts` | GET · PATCH · DELETE |
| módulo · constants | `src/modules/categories/constants.ts` | `categoryKeys`, `PAGE_SIZE_OPTIONS`, `CATEGORY_STATUS_OPTIONS` |
| módulo · types | `src/modules/categories/types/category.ts` | `Category`, `PageMeta`, `CategoryListResponse` |
| módulo · schemas | `src/modules/categories/schemas/category.schema.ts` | Zod + tipos inferidos |
| módulo · services | `src/modules/categories/services/category.service.ts` | axios sobre `api` de `src/lib/axios.ts` |
| módulo · hooks | `src/modules/categories/hooks/use-categories.ts` | `useCategories(params)` |
| módulo · hooks | `src/modules/categories/hooks/use-category-mutations.ts` | create · update · delete + invalidación |
| shared | `src/components/shared/admin-sidebar.tsx` | nav del panel (`"use client"`, usa `usePathname`) |
| app · admin | `src/app/(admin)/admin/layout.tsx` | shell del panel (Server Component) |
| módulo · components | `src/modules/categories/components/category-status-badge.tsx` | Badge Activa/Inactiva |
| módulo · components | `src/modules/categories/components/category-form.tsx` | RHF + zodResolver + primitivas `Field` |
| módulo · components | `src/modules/categories/components/category-form-dialog.tsx` | `Dialog` alta/edición |
| módulo · components | `src/modules/categories/components/delete-category-dialog.tsx` | `AlertDialog` de confirmación |
| módulo · components | `src/modules/categories/components/category-row-actions.tsx` | `DropdownMenu` + sus propios diálogos |
| módulo · components | `src/modules/categories/components/categories-columns.tsx` | column defs **estáticas** (ámbito de módulo) |
| módulo · components | `src/modules/categories/components/categories-toolbar.tsx` | buscador + `Select` de estado + "Nueva categoría" |
| módulo · components | `src/modules/categories/components/categories-table.tsx` | `useTable` v9 presentacional + skeleton/error/vacío |
| módulo · components | `src/modules/categories/components/categories-view.tsx` | contenedor `"use client"`: estado de filtros + query |
| app · admin | `src/app/(admin)/admin/categories/page.tsx` | Server Component: `metadata` + `<CategoriesView />` |

Flujo, sin atajos:

```
categories-view ("use client")
  └─ useCategories(params)            hook  · TanStack Query
       └─ categoryService.list(params)  service · axios (instancia `api` existente)
            └─ GET /api/categories       Route Handler · valida con Zod
                 └─ categoryRepository.list()  repositorio · Drizzle
                      └─ getDb()                Neon
```

**Zustand: no se usa.** El estado de UI de esta pantalla (búsqueda, filtro, página,
orden, diálogos abiertos) no se comparte fuera del árbol de `categories-view`, así
que vive en `useState` local. Un store global aquí sería una abstracción con un
único consumidor (CLAUDE.md §6).

**`"use client"`** aparece exactamente en: `admin-sidebar`, `categories-view`,
`categories-table`, `categories-toolbar`, `category-form`, `category-form-dialog`,
`delete-category-dialog`, `category-row-actions`, `use-debounce`. **No** en
`admin/layout.tsx` ni en `admin/categories/page.tsx`, que quedan como Server
Components.

## 8. Decisiones técnicas

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| **Soft delete con `deleted_at`** | `DELETE` físico | En Fase 2 `products.category_id` referenciará esta tabla. Un borrado físico obligaría a decidir `ON DELETE` (romper productos o dejarlos huérfanos) antes de tener el modelo completo. El soft delete difiere esa decisión sin perder datos históricos. |
| **`is_active` y `deleted_at` como columnas separadas** | Reutilizar `is_active` como borrado | Son dos conceptos distintos: `is_active` es un interruptor de publicación reversible que el admin alterna a diario y por el que filtra; `deleted_at` es un retiro definitivo del catálogo. Fusionarlos haría imposible el filtro "inactivas" pedido en el alcance. |
| **Índice único parcial `WHERE deleted_at IS NULL`** | `UNIQUE (slug)` a secas | Con unicidad total, borrar "teclados" impediría para siempre volver a crear "teclados". Verificado que `drizzle-orm@0.45` soporta `.where()` en el builder de índices (`pg-core/indexes.d.ts:67`). |
| **Paginación, orden y filtros resueltos en el servidor** | Traer todo y filtrar en el cliente | Categorías son pocas hoy, pero este spec fija el patrón que Fase 2 (productos, volumen alto) va a copiar. Cambiar de cliente a servidor después obliga a reescribir hook, service, handler y repositorio a la vez. |
| **TanStack Table v9 en modo manual** | Modo automático con row models de filtrado/paginación | Consecuencia de lo anterior. Verificado que `manualPagination`, `manualSorting`, `manualFiltering` y `rowCount` existen en la v9 instalada (`@tanstack/table-core@9.2.3`, `dist/features/*`). |
| **API v9: `useTable` + `tableFeatures` + `table.FlexRender`** | `useReactTable` + `getCoreRowModel()` de v8 | `docs/SETUP.md` §1 dice "TanStack Table v8", pero lo **instalado es 9.2.3** y la API de v8 no existe. Gana la realidad del `package.json`. Las features se registran explícitamente: `tableFeatures({ rowSortingFeature, rowPaginationFeature })`. Fuente: skill empaquetada en `node_modules/@tanstack/react-table/skills/getting-started/SKILL.md`. |
| **Column defs en ámbito de módulo (constante estática)** | `useMemo` dentro del componente con callbacks de fila | La skill v9 marca como error de severidad MEDIA/ALTA recrear `columns`/`data` en cada render: invalida los modelos derivados. Para lograrlo, las acciones de fila se encapsulan en `category-row-actions.tsx`, que posee sus propios diálogos, en lugar de inyectar callbacks a las columnas. |
| **Formulario con `react-hook-form` + `zodResolver` sobre las primitivas `Field` ya instaladas** | `npx shadcn@latest add form` | `src/components/ui/field.tsx` ya existe y expone `FieldGroup`, `Field`, `FieldLabel`, `FieldDescription`, `FieldError` — cubre etiqueta, descripción y error. El componente `form` es un wrapper de contexto sobre RHF que no añadiría nada aquí: sería una abstracción de un solo consumidor (CLAUDE.md §6). |
| **`AlertDialog` para confirmar borrado, `Dialog` para alta/edición** | `Dialog` para ambos | Regla explícita de la skill `vercel:shadcn`: *"Use AlertDialog (not Dialog) for destructive confirmation"*. `alert-dialog` no está instalado: se agrega. |
| **Envelope de error `{ message }`** | `{ error: { code, detail } }` u otro | `src/lib/axios.ts` ya está implementado y su interceptor lee `error.response.data.message`. Cambiar el envelope obligaría a tocar un archivo que el enunciado marca como "reusar tal cual". |
| **Slug autogenerado desde `name` si no se envía, editable si se envía** | Slug siempre obligatorio | Reduce fricción en el alta (el caso normal) sin perder control cuando el admin necesita un slug concreto para SEO. |
| **`404` para id inexistente **y** para id soft-deleted** | `410 Gone` para borradas | Desde fuera de la API, una categoría borrada no existe. Un `410` filtraría la existencia de la fila sin aportar nada al cliente. |
| **Conflicto de slug detectado con `existsBySlug()` antes del insert, más captura del error `23505` de Postgres** | Solo la comprobación previa | La comprobación previa da un `409` limpio en el 99 % de los casos; el índice único es la garantía real ante dos altas simultáneas. Sin la captura del `23505`, esa carrera daría un `500`. |
| **Layout de admin mínimo dentro de este spec** | Dejarlo para un spec de dashboard | `src/app/(admin)/admin/layout.tsx` no existe; sin él la pantalla de categorías hereda solo el layout raíz (que hoy renderiza la barra de Clerk) y queda sin navegación. Es un archivo, sin lógica de negocio, y desbloquea la única pantalla de esta fase. |
| **Sin transacciones** | Envolver las mutaciones en `db.transaction()` | Cada operación de este CRUD es una sola sentencia. Además el driver es `drizzle-orm/neon-http`, que no soporta transacciones interactivas. Cuando entre `logAudit()` (spec de auth) habrá que reevaluar el driver. |

## 9. Tareas

Verificación por defecto: `npm run typecheck`. La tarea final corre la batería completa.

### Base

- [x] **T1** — Instalar componentes shadcn faltantes · comando: `npx shadcn@latest add alert-dialog textarea switch` · verificación: existen `src/components/ui/{alert-dialog,textarea,switch}.tsx`
- [x] **T2** — Añadir `slugify(input: string): string` (minúsculas, sin diacríticos vía `normalize("NFD")`, no alfanuméricos → `-`, colapsa y recorta guiones) · archivo: `src/lib/utils.ts` · verificación: `npm run typecheck`
- [x] **T3** — Crear helpers de error de API: `jsonError(status, message, issues?)`, clases `NotFoundError` y `SlugConflictError`, y `handleApiError(error): Response` que mapea `ZodError → 400`, `NotFoundError → 404`, `SlugConflictError → 409`, resto → `500` · archivo: `src/lib/api-error.ts` · verificación: `npm run typecheck`
- [x] **T4** — Crear `useDebounce<T>(value, delay)` · archivo: `src/hooks/use-debounce.ts` · verificación: `npm run typecheck`

### Datos

- [x] **T5** — Definir la tabla `categories` con columnas e índices de §5 · archivo: `src/server/db/schema/category.ts` · verificación: `npm run typecheck`
- [x] **T6** — Re-exportar la tabla en el barrel (`export * from "./category";`, eliminando `export {};`) · archivo: `src/server/db/schema/index.ts` · verificación: `npm run typecheck`
- [x] **T7** — Generar y aplicar la migración · comandos: `npm run db:generate && npm run db:migrate` · verificación: el SQL en `drizzle/` contiene `CREATE UNIQUE INDEX ... WHERE "deleted_at" is null` y `npm run db:studio` muestra la tabla
- [x] **T8** — Sembrar 5–6 categorías de tecnología (al menos una con `is_active = false`), idempotente vía `onConflictDoNothing()` · archivo: `src/server/db/seed.ts` · verificación: `npm run db:seed` dos veces seguidas no duplica filas

### Repositorio

- [x] **T9** — Implementar `category.repository.ts` con `list(params)` (filtra `deleted_at IS NULL`, `ilike` sobre `name` OR `slug`, filtro `isActive`, orden dinámico por columna permitida, `limit`/`offset`, y `count()` para el total), `findById(id)`, `existsBySlug(slug, excludeId?)`, `create(input)`, `update(id, input)`, `softDelete(id)` · archivo: `src/server/repositories/category.repository.ts` · verificación: `npm run typecheck`

### Módulo compartido (tipos y contratos)

- [x] **T10** — Definir `categoryKeys` (query keys de TanStack Query), `PAGE_SIZE_OPTIONS`, `CATEGORY_STATUS_OPTIONS`, `DEFAULT_PAGE_SIZE`, `SEARCH_DEBOUNCE_MS` · archivo: `src/modules/categories/constants.ts` · verificación: `npm run typecheck`
- [x] **T11** — Definir `Category` (vía `InferSelectModel`, con `import type`), `PageMeta` y `CategoryListResponse` · archivo: `src/modules/categories/types/category.ts` · verificación: `npm run typecheck`
- [x] **T12** — Definir los schemas Zod de §6 con mensajes en español y exportar sus tipos inferidos · archivo: `src/modules/categories/schemas/category.schema.ts` · verificación: `npm run typecheck`

### API

- [x] **T13** — Implementar `GET` (lista paginada, valida `searchParams` con `categoryQuerySchema`) y `POST` (valida body, autogenera slug con `slugify` si falta, comprueba `existsBySlug`, responde `201`) · archivo: `src/app/api/categories/route.ts` · verificación: `npm run typecheck` + `curl` local devuelve `{ data, meta }`
- [x] **T14** — Implementar `GET`, `PATCH` y `DELETE` usando `RouteContext<'/api/categories/[id]'>` y `await ctx.params`, validando el id con `categoryIdSchema` · archivo: `src/app/api/categories/[id]/route.ts` · verificación: `npm run typecheck` + `curl` devuelve `404` para un uuid inexistente

### Cliente — datos

- [x] **T15** — Implementar `categoryService` (`list`, `getById`, `create`, `update`, `remove`) sobre la instancia `api` de `@/lib/axios` · archivo: `src/modules/categories/services/category.service.ts` · verificación: `npm run typecheck`
- [x] **T16** — Implementar `useCategories(params)` con `useQuery`, `queryKey: categoryKeys.list(params)` y `placeholderData: keepPreviousData` (evita el parpadeo al paginar) · archivo: `src/modules/categories/hooks/use-categories.ts` · verificación: `npm run typecheck`
- [x] **T17** — Implementar `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory` con invalidación de `categoryKeys.lists()` en `onSuccess`; sin toasts (viven en los componentes) · archivo: `src/modules/categories/hooks/use-category-mutations.ts` · verificación: `npm run typecheck`

### Cliente — shell del admin

- [x] **T18** — Crear el sidebar con enlace a "Categorías" y resaltado por `usePathname` · archivo: `src/components/shared/admin-sidebar.tsx` · verificación: `npm run typecheck`
- [x] **T19** — Crear el layout del panel (Server Component, sin `"use client"`, sin guard de rol) que compone sidebar + `{children}` · archivo: `src/app/(admin)/admin/layout.tsx` · verificación: `npm run build`

### Cliente — UI de categorías

- [x] **T20** — Crear `CategoryStatusBadge` (`Activa` / `Inactiva`) · archivo: `src/modules/categories/components/category-status-badge.tsx` · verificación: `npm run typecheck`
- [x] **T21** — Crear `CategoryForm` (RHF + `zodResolver`, primitivas `Field`, campos: nombre, slug, descripción `Textarea`, URL de imagen, `Switch` de estado; botón con spinner mientras `isPending`; error del servidor renderizado sobre el formulario) · archivo: `src/modules/categories/components/category-form.tsx` · verificación: `npm run typecheck`
- [x] **T22** — Crear `CategoryFormDialog` (`Dialog`; modo alta o edición según reciba `category`; cierra solo en éxito; dispara toast) · archivo: `src/modules/categories/components/category-form-dialog.tsx` · verificación: `npm run typecheck`
- [x] **T23** — Crear `DeleteCategoryDialog` (`AlertDialog`, copy en español nombrando la categoría, acción destructiva con estado de carga) · archivo: `src/modules/categories/components/delete-category-dialog.tsx` · verificación: `npm run typecheck`
- [x] **T24** — Crear `CategoryRowActions` (`DropdownMenu` con Editar / Eliminar; posee su propio estado de apertura de ambos diálogos) · archivo: `src/modules/categories/components/category-row-actions.tsx` · verificación: `npm run typecheck`
- [x] **T25** — Definir las columnas con `createColumnHelper<typeof features, Category>()` en **ámbito de módulo**: imagen+nombre, slug, estado, fecha de creación, acciones · archivo: `src/modules/categories/components/categories-columns.tsx` · verificación: `npm run typecheck`
- [x] **T26** — Crear `CategoriesToolbar` (Input de búsqueda con icono, `Select` de estado con opciones Todas/Activas/Inactivas, botón "Nueva categoría") · archivo: `src/modules/categories/components/categories-toolbar.tsx` · verificación: `npm run typecheck`
- [x] **T27** — Crear `CategoriesTable` presentacional: `useTable({ features, columns, data, state, rowCount, manualPagination: true, manualSorting: true, manualFiltering: true, ... })` con `tableFeatures({ rowSortingFeature, rowPaginationFeature })`, render con `table.FlexRender`, cabeceras ordenables clicables, y los tres estados (skeleton con `Skeleton`, error con botón "Reintentar", vacío) · archivo: `src/modules/categories/components/categories-table.tsx` · verificación: `npm run typecheck`
- [x] **T28** — Crear `CategoriesView` (`"use client"`): posee `search`/`isActive`/`pagination`/`sorting`, aplica `useDebounce` a la búsqueda, resetea a página 1 al cambiar filtros, llama `useCategories` y compone toolbar + tabla + diálogo de alta · archivo: `src/modules/categories/components/categories-view.tsx` · verificación: `npm run typecheck`
- [x] **T29** — Crear la página (Server Component: `export const metadata`, título "Categorías" y `<CategoriesView />`) · archivo: `src/app/(admin)/admin/categories/page.tsx` · verificación: `npm run build`

### Cierre

- [x] **T30** — Recorrer los AC1–AC16 contra la app corriendo y ejecutar la batería completa · comando: `npm run typecheck && npm run lint && npm run build` · verificación: los tres en verde y todos los AC marcados

## 10. Riesgos y consideraciones

**Seguridad — el riesgo dominante.** Los cinco endpoints quedan abiertos a internet:
cualquiera puede crear, editar o borrar categorías, y `/admin/categories` es
navegable sin sesión. Es aceptable solo mientras el proyecto viva en local o en un
preview no indexado. **No desplegar a un dominio público sin cerrar §11.**

**Índice único parcial.** Es el punto de la migración con más probabilidad de salir
distinto a lo esperado. Al terminar T7 hay que abrir el `.sql` generado y confirmar
que contiene la cláusula `WHERE "deleted_at" is null`. Si `drizzle-kit` la omitiera,
el fallback es un `CREATE UNIQUE INDEX ... WHERE ...` escrito a mano en la migración,
dejando la definición en el schema para que el tipado siga siendo correcto.

**Carrera en el slug.** `existsBySlug()` seguido de `insert` no es atómico. Dos altas
simultáneas con el mismo slug harían fallar la segunda con el error `23505` de
Postgres. Por eso T3 exige mapear ese código a `409` y no a `500`.

**Búsqueda con `ILIKE '%…%'`.** No usa índice: hace *sequential scan*. Irrelevante
con decenas de categorías, inaceptable para productos en Fase 2, donde habrá que
evaluar `pg_trgm` o `tsvector`. Queda anotado para ese spec, no se resuelve aquí.

**`neon-http` y transacciones.** El driver configurado en `src/server/db/index.ts` es
`drizzle-orm/neon-http`, sin transacciones interactivas. Este CRUD no las necesita,
pero la regla dura 9 de CLAUDE.md (`audit_logs` en la misma transacción que la
mutación) obligará a migrar a `neon-serverless` (WebSocket) o a Postgres.js cuando
llegue el spec de auditoría. Es una decisión de ese spec, no de este.

**Estabilidad de referencias en TanStack Table v9.** Si `columns`, `data` o `features`
se recrean en cada render, los modelos derivados se invalidan y la tabla parpadea o
pierde estado. Mitigación ya incorporada al diseño: `features` y `columns` en ámbito
de módulo (T25), `data` proveniente del cache de TanStack Query, y una constante
`EMPTY_CATEGORIES: Category[] = []` de ámbito de módulo como fallback en lugar de
`?? []` inline.

**Fuga de `drizzle-orm` al bundle de cliente.** `src/modules/categories/types/category.ts`
importa del schema del servidor. Si el `import type` se convierte en un import de valor
(por ejemplo, un autoimport del editor), `drizzle-orm` acaba en el bundle del navegador.
Revisar explícitamente en review.

**Datos existentes y rollback.** La tabla es nueva y nada la referencia todavía: el
rollback es `DROP TABLE categories;` más revertir el archivo de migración. Sin riesgo
para datos de producción porque no hay producción.

**N+1.** No aplica: el listado es una única consulta más un `count()`. Se convierte en
un riesgo real en Fase 2, al mostrar el número de productos por categoría.

## 11. Fuera de alcance / deuda aceptada

### Deuda 1 — Sin autenticación ni autorización (decisión explícita del usuario)

> **En esta primera etapa NO se implementa autenticación ni autorización.** Las rutas
> y la UI de admin de categorías quedan libres/abiertas por ahora — sin
> `requirePermission()`, sin `logAudit()`, sin protección en `middleware.ts`. Esto es
> una decisión consciente del usuario, no un olvido.

Consecuencia operativa para los agentes: **`developer` no debe añadir guards y
`reviewer` no debe reportar su ausencia como hallazgo bloqueante en este spec.**
El estado actual de `src/middleware.ts` (solo `clerkMiddleware()` sin `createRouteMatcher`)
es correcto para esta fase.

Esto es **deuda técnica aceptada temporalmente**. Un spec futuro de auth/RBAC debe
cerrarla **antes de cualquier despliegue a producción**, e incluirá como mínimo:
protección de `/admin/*` y `/api/categories` (escritura) en `middleware.ts`;
`requirePermission('categories.create' | '.update' | '.delete')` en cada handler de
mutación; `logAudit()` transaccional para `category.created`, `category.updated` y
`category.deleted`; y las tablas `users`, `roles`, `permissions`, `role_permissions`,
`user_roles` y `audit_logs` de `docs/SETUP.md` §5.1–5.2.

### Deuda 2 — `docs/SETUP.md` §1 desactualizado

La tabla de stack declara TanStack Table v8; lo instalado es `@tanstack/react-table@9.2.3`,
cuya API es incompatible. Este spec usa la v9 real. Actualizar esa fila de `SETUP.md`
queda fuera de alcance para no mezclar cambios de documentación con la feature.

### Deuda 3 — Sin purga de soft-deletes

Las filas con `deleted_at` se acumulan indefinidamente. Retomar cuando el volumen lo
justifique o cuando exista una política de retención junto a la de `audit_logs`
(`docs/SETUP.md` §5.2 sugiere 180 días para `info`).

### Diferido a otros specs

| Tema | Cuándo retomarlo |
|---|---|
| `sort_order` (orden manual de categorías en el storefront) | Cuando se construya el menú de navegación del storefront |
| Jerarquía `parent_id` (subcategorías) | Solo si el catálogo real la exige; hoy es especulación |
| Uploader de imágenes (Vercel Blob) en vez de URL manual | Junto con la galería de productos, Fase 2 |
| Exponer categorías en `(storefront)` | Spec del catálogo público |
| `pg_trgm` / búsqueda full-text | Spec de productos, donde el volumen lo justifica |
| Página `/admin` (dashboard con Recharts) | Spec del dashboard |
| Restauración de categorías borradas desde la UI | Cuando alguien la pida; hoy se hace por SQL |
| Tests automatizados | Cuando se instale un runner (no hay ninguno en `package.json`) |

## 12. Historial de revisión

### Iteración 1/3 — hallazgos del `reviewer` corregidos

| Hallazgo | Corrección |
|---|---|
| **[BLOQUEANTE]** `createCategorySchema.partial()` conservaba el `.default(true)` de `isActive`, así que todo `PATCH` parcial reactivaba una categoría desactivada | `updateCategorySchema` pasa a `createCategorySchema.omit({ isActive: true }).partial().extend({ isActive: z.boolean().optional() })`. `POST` sigue usando `createCategorySchema` intacto. Verificado contra Neon: `PATCH {"name":"…"}` sobre `accesorios-descontinuados` la deja en `isActive: false`, y `PATCH {"isActive":true}` sigue publicándola |
| **[MENOR]** `"Ya existe una categoría con ese slug."` repetido en 3 archivos | `SLUG_TAKEN_MESSAGE` se exporta desde `category.repository.ts` y lo consumen los dos Route Handlers. AC3 reverificado: `409` con el mismo mensaje en `POST` y en `PATCH` |
| **[MENOR]** cabeceras ordenables sin `aria-sort` | `aria-sort` en el `<TableHead>` de las columnas ordenables (`ascending`/`descending`/`none`) |
| **[MENOR]** el tercer clic quitaba el orden en el cliente pero el servidor seguía ordenando | `enableSortingRemoval: false` en `useTable`: el ciclo es asc ⇄ desc |
| **[MENOR, opcional]** cada fila montaba las dos mutaciones del diálogo de edición | `CategoryRowActions` monta sus diálogos solo cuando se abren: con `pageSize` alto ya no hay observadores de mutación por fila |

### Iteración 2/3 — verificación del `reviewer`: APROBADO

| Verificado | Evidencia |
|---|---|
| Batería completa | `npm run typecheck`, `npm run lint`, `npm run build` en verde (build: 6 rutas, sin warnings propios) |
| Fix del BLOQUEANTE | `updateCategorySchema.safeParse({})` → `{}` sin `isActive`. Contra Neon: `PATCH {"description":…}`, `PATCH {"name":…}` y `PATCH {}` sobre `accesorios-descontinuados` la dejan en `isActive:false`; `PATCH {"isActive":true}` sí la reactiva. Edición por UI de esa misma categoría: sigue inactiva |
| AC3 | `409 {"message":"Ya existe una categoría con ese slug."}` idéntico en `POST` y en `PATCH` tras extraer `SLUG_TAKEN_MESSAGE` |
| `SLUG_TAKEN_MESSAGE` en el repositorio | Aceptado: la unicidad del slug es invariante de dominio y `mapSlugConflict()` (error `23505`) necesita el mismo literal. `api-error.ts` conserva su default genérico |
| `aria-sort` / `enableSortingRemoval` | DOM real: `Categoría → none`, `Creada → descending`, columnas no ordenables sin atributo |
| Mount condicional de diálogos de fila | Aceptado: 0 diálogos montados en reposo con 6 filas; al cerrar, `body.pointer-events` vuelve a `auto` y la página sigue interactiva. Se paga la animación de salida de Radix en los diálogos de fila; el de alta, montado en `categories-view`, la conserva |
| AC2 · AC5 · AC6 · AC8 · AC9 · AC10 · AC12 · AC13 · AC14 | Recorridos contra la app corriendo (API con curl, UI en navegador headless) |

Hallazgos MENORES abiertos (no bloquean, se pueden tomar en el spec 002):

1. `src/app/api/categories/[id]/route.ts:60` — un `PATCH {"name":…}` sin `slug`
   regenera el slug y cambia la URL pública en silencio. La UI siempre envía
   `slug`, así que solo afecta a llamadas directas a la API.
2. `delete-category-dialog.tsx` / `category-form-dialog.tsx` — si el usuario cierra
   el diálogo con Escape mientras la mutación está en vuelo, el componente se
   desmonta y TanStack Query descarta los callbacks de `mutate()`
   (`MutationObserver` los condiciona a `hasListeners()`): un `DELETE` fallido no
   muestra su toast de error. La invalidación sí ocurre.
