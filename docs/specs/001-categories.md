---
id: 001
title: CRUD de categorías (admin)
status: done
module: categories
scope: admin
---

# 001 — CRUD de categorías (admin)

Fase 1 del catálogo. Fija los patrones que copia el spec 002 (productos).
Detalle completo del proceso en `specs/archive/001-categories.full.md`.

## Objetivo
Un administrador puede crear, listar, buscar, filtrar, editar y eliminar categorías
desde `/admin/categories`, sobre datos en Neon.

## Alcance
Incluye: tabla `categories` + migración · CRUD en `/api/categories[/[id]]` con Zod ·
`category.repository.ts` · service + hooks · pantalla con TanStack Table (paginación,
orden, filtro por estado y búsqueda, todo en servidor) · layout de admin con sidebar ·
estados de carga/error/vacío · seed.

No incluye: **auth y autorización** (decisión explícita del usuario — ver Deuda 1) ·
productos · storefront · uploader de imágenes · subcategorías (`parent_id`) · orden manual.

## Criterios de aceptación
Los 16 AC quedaron verificados contra la app corriendo. Resumen:
- [x] Migración aplicada; slug único **solo entre filas vivas** (índice parcial).
- [x] `POST` autogenera el slug desde `name` si no se envía; `409` si ya existe.
- [x] Zod valida toda entrada → `400` con `issues`; id inexistente o borrado → `404`.
- [x] `GET` pagina, busca por nombre/slug y filtra por `isActive` en servidor.
- [x] `DELETE` es soft delete; la fila desaparece del listado.
- [x] UI: skeleton, error con reintento, vacío, búsqueda con debounce, confirmación
      de borrado con `AlertDialog`, error de servidor visible en el formulario.
- [x] `npm run typecheck && npm run lint && npm run build` en verde.

## Datos

Tabla `categories` (nueva, migración aplicada).

| Columna | Tipo | Nota |
|---|---|---|
| `id` | uuid PK `defaultRandom()` | |
| `name` | varchar(120) not null | |
| `slug` | varchar(140) not null | único entre filas vivas |
| `description` | text null | |
| `image_url` | text null | URL, no hay uploader |
| `is_active` | boolean not null default true | publicación, reversible desde la UI |
| `deleted_at` | timestamptz null | soft delete — distinto de `is_active` |
| `created_at` / `updated_at` | timestamptz not null | `updated_at` con `$onUpdate()` |

Índices: `categories_slug_active_unq` = `UNIQUE (slug) WHERE deleted_at IS NULL` ·
`categories_created_at_idx` = `(created_at DESC)`.

Tipo: `Category = InferSelectModel<typeof categories>` con **`import type`**
(si se vuelve import de valor, `drizzle-orm` se filtra al bundle de cliente).

## API

Envelope de error fijo: `{ message: string, issues?: { path, message }[] }` — lo lee
el interceptor de `src/lib/axios.ts`.

| Método | Ruta | Auth | Request | Response | Errores |
|---|---|---|---|---|---|
| GET | `/api/categories` | ninguna (fase 1) | query | `{ data: Category[], meta: PageMeta }` | 400, 500 |
| POST | `/api/categories` | ninguna | `CreateCategoryInput` | `Category` (201) | 400, 409, 500 |
| GET | `/api/categories/[id]` | ninguna | — | `Category` | 400, 404, 500 |
| PATCH | `/api/categories/[id]` | ninguna | `UpdateCategoryInput` | `Category` | 400, 404, 409, 500 |
| DELETE | `/api/categories/[id]` | ninguna | — | 204 | 400, 404, 500 |

`PageMeta = { page, pageSize, total, totalPages }`.
Schemas en `src/modules/categories/schemas/category.schema.ts`: `categoryQuerySchema`
(page, pageSize, search, isActive, sortBy, sortDir con defaults), `createCategorySchema`,
`updateCategorySchema` (= create `.omit({isActive}).partial().extend({isActive: optional})`,
para que un PATCH parcial **no** reactive una categoría desactivada) y `categoryIdSchema`.
Mensajes en español. `[id]` se tipa con `RouteContext<'/api/categories/[id]'>` y
`ctx.params` requiere `await` (Next 16).

## Reutilizar (creado aquí, el spec 002 lo usa tal cual)

- `src/lib/api-error.ts` — `jsonError()`, `handleApiError()`, `NotFoundError`, `SlugConflictError`.
- `src/lib/utils.ts` — `slugify()`.
- `src/hooks/use-debounce.ts` · `src/components/shared/admin-sidebar.tsx` · `src/app/(admin)/admin/layout.tsx`.
- `src/components/ui/`: `alert-dialog`, `textarea`, `switch`, `field` (formularios usan
  las primitivas `Field` + RHF + `zodResolver`, **no** el componente `form` de shadcn).
- Patrón de módulo a copiar: `src/modules/categories/{constants,types,schemas,services,hooks,components}`
  — `constants.ts` con las query keys, tabla presentacional separada del contenedor
  `*-view.tsx` (`"use client"`), acciones de fila con sus propios diálogos.

## Decisiones que siguen vigentes

| Decisión | Razón |
|---|---|
| Soft delete con `deleted_at` | `products.category_id` va a referenciar esta tabla; el borrado físico obligaría a decidir `ON DELETE` antes de tener el modelo. |
| `is_active` ≠ `deleted_at` | Publicación reversible vs. retiro definitivo. Fusionarlos rompe el filtro por estado. |
| Índice único **parcial** | Con unicidad total, borrar "teclados" impediría volver a crearlo. |
| Paginar/ordenar/filtrar en servidor | Fase 2 tiene volumen; cambiar después obliga a reescribir hook, service, handler y repositorio a la vez. |
| TanStack Table **v9** (`useTable` + `tableFeatures` + `table.FlexRender`), modo manual | Lo instalado es `@tanstack/react-table@9.2.3`; la API v8 no existe. `columns` y `features` en ámbito de módulo: recrearlos por render invalida los modelos derivados. |
| `AlertDialog` para borrar, `Dialog` para alta/edición | Confirmación destructiva. |
| `existsBySlug()` **y** captura del error `23505` de Postgres | La comprobación previa da un 409 limpio; el índice cubre la carrera entre dos altas simultáneas. |
| Sin `db.transaction()` | Cada operación es una sentencia y el driver es `neon-http`, sin transacciones interactivas. |
| Sin Zustand | El estado de filtros no sale del árbol de `categories-view`: `useState` local. |

## Deuda abierta

1. **Sin auth ni autorización.** Los 5 endpoints están abiertos y `/admin/categories`
   es navegable sin sesión. Decisión consciente: `developer` no añade guards aquí y
   `reviewer` no lo reporta como hallazgo **en este spec**. Un spec de auth/RBAC debe
   cerrarlo antes de cualquier despliegue público: `middleware.ts`, `requirePermission('categories.*')`
   y `logAudit()` transaccional — lo que obliga a migrar de `neon-http` a un driver
   con transacciones (`neon-serverless` o postgres.js).
2. **Búsqueda `ILIKE '%…%'`** hace sequential scan. Irrelevante con decenas de filas,
   no para productos: evaluar `pg_trgm` o `tsvector` en el spec 002.
3. **Sin purga de soft-deletes** ni restauración desde la UI (hoy se hace por SQL).
4. `PATCH {"name":…}` sin `slug` regenera el slug y cambia la URL pública en silencio
   (`api/categories/[id]/route.ts`). La UI siempre envía `slug`; solo afecta llamadas directas.
5. Cerrar un diálogo con Escape con la mutación en vuelo descarta el toast de error
   (TanStack Query condiciona los callbacks de `mutate()` a `hasListeners()`). La
   invalidación sí ocurre.
6. Diferido a sus specs: `sort_order`, jerarquía `parent_id`, uploader (Vercel Blob),
   categorías en el storefront, dashboard `/admin`, tests (no hay runner instalado).
