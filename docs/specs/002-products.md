---
id: 002
title: CRUD de productos (admin)
status: done
module: products
scope: admin
---

# 002 — CRUD de productos (admin)

Fase 2 del catálogo. Copia los patrones fijados en `001-categories.md`; solo se
documenta aquí lo que cambia. Código y tablas en inglés, textos de UI en español.

## Objetivo

Un administrador puede crear, listar, buscar, filtrar por categoría y estado, ordenar,
editar y eliminar productos desde `/admin/products`, sobre datos en Neon.

## Alcance

Incluye: tabla `products` + migración · FK a `categories` · CRUD en
`/api/products[/[id]]` con Zod · `product.repository.ts` con join a `categories` ·
módulo `src/modules/products/*` · pantalla con TanStack Table v9 (paginación, orden,
búsqueda y filtros **en servidor**) · precios en centavos · estados carga/error/vacío · seed.

No incluye: auth ni autorización (Deuda 1) · `product_images` y uploader (una sola
`image_url`) · variantes/atributos · storefront · movimientos de stock ni reservas.

## Criterios de aceptación

- [x] AC1 — Migración generada y aplicada; `products.category_id` con FK a `categories.id`.
- [x] AC2 — Dado un `name` sin `slug`, cuando `POST /api/products`, entonces el slug se autogenera con `slugify()`; si ya existe entre filas vivas → `409`.
- [x] AC3 — `sku` duplicado entre filas vivas → `409` con mensaje propio (distinto del de slug).
- [x] AC4 — `priceCents` y `stock` son enteros ≥ 0; decimal o negativo → `400` con `issues`.
- [x] AC5 — `categoryId` inexistente o de categoría soft-deleted → `400` (no `500` por la FK).
- [x] AC6 — `GET /api/products` pagina, busca por `name`/`sku`/`slug`, filtra por `isActive` y `categoryId`, y ordena por `name|priceCents|stock|createdAt|updatedAt`, todo en servidor.
- [x] AC7 — Cada fila del listado trae `category: { id, name, slug }` resuelta con un solo join (sin N+1).
- [x] AC8 — `DELETE` es soft delete: la fila desaparece del listado y libera su slug/sku.
- [x] AC9 — La tabla muestra precio formateado (`S/ 1.234,56`) a partir de centavos; nunca `float`.
- [x] AC10 — UI: skeleton, error con reintento, vacío, búsqueda con debounce, `AlertDialog` de borrado, error de servidor visible en el formulario.
- [x] AC11 — `npm run db:seed` inserta productos de ejemplo por categoría y es idempotente.
- [x] AC12 — `npm run typecheck && npm run lint` en verde.

Verificación: AC1–AC8 comprobados con `curl` contra la app corriendo (alta, slug
autogenerado, 409 de slug y de SKU por separado, 400 de precio decimal, stock
negativo, categoría inexistente y categoría soft-deleted, soft delete que libera
slug/SKU y permite recrear). AC9 y AC11 comprobados ejecutando `formatCents`/
`toCents` y corriendo el seed dos veces. AC10 se validó por código y con la
página renderizando 200, no con QA visual en el navegador.

## Datos

Tabla `products` (nueva). **Requiere migración.** Confirmar o ajustar estas columnas
antes de aprobar el spec:

| Columna                     | Tipo         | Null | Default           | Nota                                               |
| --------------------------- | ------------ | ---- | ----------------- | -------------------------------------------------- |
| `id`                        | uuid PK      | no   | `defaultRandom()` |                                                    |
| `name`                      | varchar(160) | no   | —                 |                                                    |
| `slug`                      | varchar(180) | no   | —                 | único entre filas vivas                            |
| `sku`                       | varchar(64)  | no   | —                 | único entre filas vivas; se normaliza a mayúsculas |
| `description`               | text         | sí   | —                 |                                                    |
| `price_cents`               | integer      | no   | —                 | centavos, `check >= 0`                             |
| `compare_at_price_cents`    | integer      | sí   | —                 | precio tachado; `check >= 0`                       |
| `stock`                     | integer      | no   | `0`               | `check >= 0`                                       |
| `category_id`               | uuid         | no   | —                 | FK → `categories.id`, `ON DELETE RESTRICT`         |
| `image_url`                 | text         | sí   | —                 | URL, sin uploader                                  |
| `is_active`                 | boolean      | no   | `true`            | publicación, reversible desde la UI                |
| `deleted_at`                | timestamptz  | sí   | —                 | soft delete                                        |
| `created_at` / `updated_at` | timestamptz  | no   | `defaultNow()`    | `updated_at` con `$onUpdate()`                     |

Índices: `products_slug_active_unq` = `UNIQUE (slug) WHERE deleted_at IS NULL` ·
`products_sku_active_unq` = `UNIQUE (sku) WHERE deleted_at IS NULL` ·
`products_category_id_idx` · `products_created_at_idx` = `(created_at DESC)`.

Sin columna `currency`: precio único en PEN, formateado en la UI (Deuda 4).
Tipo: `InferSelectModel<typeof products>` con **`import type`**, como en `types/category.ts`.

## API

Mismo envelope de error `{ message, issues? }` de `src/lib/api-error.ts`.

| Método | Ruta                 | Auth             | Body                 | Response                                                 |
| ------ | -------------------- | ---------------- | -------------------- | -------------------------------------------------------- |
| GET    | `/api/products`      | ninguna (fase 2) | query                | `{ data: ProductListItem[], meta: PageMeta }` · 400, 500 |
| POST   | `/api/products`      | ninguna          | `CreateProductInput` | `Product` (201) · 400, 409, 500                          |
| GET    | `/api/products/[id]` | ninguna          | —                    | `Product` · 400, 404, 500                                |
| PATCH  | `/api/products/[id]` | ninguna          | `UpdateProductInput` | `Product` · 400, 404, 409, 500                           |
| DELETE | `/api/products/[id]` | ninguna          | —                    | 204 · 400, 404, 500                                      |

`ProductListItem = Product & { category: { id, name, slug } }`.
Schemas en `src/modules/products/schemas/product.schema.ts`, mensajes en español:
`productQuerySchema` (page, pageSize, search, isActive, categoryId, sortBy, sortDir con
defaults), `createProductSchema` (name, slug?, sku, description?, priceCents,
compareAtPriceCents?, stock, categoryId, imageUrl?, isActive), `updateProductSchema`
(= create `.omit({isActive}).partial().extend({isActive: optional})`, mismo motivo que
en 001) y `productIdSchema`. `[id]` se tipa con `RouteContext<'/api/products/[id]'>`
y `ctx.params` requiere `await` (Next 16).

## Reutilizar

Tal cual, sin reescribir:

- `src/lib/api-error.ts` — `jsonError`, `handleApiError`, `NotFoundError`, `SlugConflictError`, `isUniqueViolation`.
- `src/lib/utils.ts` — `slugify()`, `cn()`. · `src/lib/axios.ts` — `api`.
- `src/hooks/use-debounce.ts` · `src/app/(admin)/admin/layout.tsx` · `src/components/shared/admin-sidebar.tsx`.
- `src/components/ui/`: `table`, `dialog`, `alert-dialog`, `field`, `input`, `textarea`,
  `select`, `switch`, `badge`, `skeleton`, `dropdown-menu`, `button`, `sonner`.
  **No hace falta instalar componentes shadcn nuevos.**
- `src/modules/categories/hooks/use-categories.ts` — alimenta el `Select` de categoría
  del formulario y del toolbar (`pageSize: 100, isActive: true`).
- Patrón a copiar archivo por archivo de `src/modules/categories/`: `constants.ts` con
  query keys, `*-columns.tsx` con `tableFeatures` y `columns` en ámbito de módulo,
  tabla presentacional separada del contenedor `*-view.tsx` (`"use client"`),
  `*-row-actions.tsx` con sus propios diálogos, formulario con primitivas `Field` + RHF
  - `zodResolver` (**no** el componente `form` de shadcn).

## Tareas

- [x] T1 — Tabla, checks e índices · `src/server/db/schema/product.ts` (+ re-export en `schema/index.ts`)
- [x] T2 — Generar y aplicar migración · `npm run db:generate && npm run db:migrate`
- [x] T3 — `PageMeta` compartido · `src/types/api.ts`
- [x] T4 — Tipos `Product`, `ProductListItem`, `ProductListResponse` · `src/modules/products/types/product.ts`
- [x] T5 — Schemas Zod · `src/modules/products/schemas/product.schema.ts`
- [x] T6 — Helpers `formatCents()` y `toCents()` · `src/lib/format.ts`
- [x] T7 — Repositorio (list con join, findById, existsBySlug, existsBySku, create, update, softDelete) · `src/server/repositories/product.repository.ts`
- [x] T8 — Handlers GET/POST · `src/app/api/products/route.ts`
- [x] T9 — Handlers GET/PATCH/DELETE · `src/app/api/products/[id]/route.ts`
- [x] T10 — Query keys, page sizes, opciones de estado y orden · `src/modules/products/constants.ts`
- [x] T11 — Service axios · `src/modules/products/services/product.service.ts`
- [x] T12 — `useProducts` · `src/modules/products/hooks/use-products.ts`
- [x] T13 — `useCreateProduct`, `useUpdateProduct`, `useDeleteProduct` · `src/modules/products/hooks/use-product-mutations.ts`
- [x] T14 — Columnas y `tableFeatures` · `src/modules/products/components/products-columns.tsx`
- [x] T15 — Tabla presentacional con skeleton/error/vacío · `src/modules/products/components/products-table.tsx`
- [x] T16 — Toolbar (búsqueda, estado, categoría, alta) · `src/modules/products/components/products-toolbar.tsx`
- [x] T17 — Formulario RHF · `src/modules/products/components/product-form.tsx`
- [x] T18 — Diálogo alta/edición · `src/modules/products/components/product-form-dialog.tsx`
- [x] T19 — Acciones de fila · `src/modules/products/components/product-row-actions.tsx`
- [x] T20 — Confirmación de borrado · `src/modules/products/components/delete-product-dialog.tsx`
- [x] T21 — Contenedor con estado de filtros · `src/modules/products/components/products-view.tsx`
- [x] T22 — Página server component · `src/app/(admin)/admin/products/page.tsx`
- [x] T23 — Entrada "Productos" en el nav · `src/components/shared/admin-sidebar.tsx`
- [x] T24 — Seed idempotente de productos por categoría · `src/server/db/seed.ts`

Verificación final: `npm run typecheck && npm run lint && npm run build`, los tres
en verde. Migración aplicada: `drizzle/0001_sleepy_joshua_kane.sql`.

## Notas

- El precio se captura en soles y se persiste en centavos: `toCents()` debe parsear el
  string decimal, **no** `Math.round(value * 100)` (deriva de coma flotante).
- `categoryId` se valida contra `categoryRepository.findById()` (devuelve `null` si está
  soft-deleted) **antes** del insert: la FK sola daría `500` en vez de `400`.
- Dos índices únicos parciales ⇒ `isUniqueViolation` no distingue slug de sku. El
  repositorio comprueba ambos antes (`existsBySlug`/`existsBySku`) y mapea el `23505`
  residual al mensaje de slug; documentarlo en el archivo.
- `list()` hace `innerJoin(categories)` y devuelve la categoría anidada: no consultar
  categoría por fila.
- Sin `db.transaction()`: driver `neon-http`, cada operación es una sentencia.

## Notas de implementación

Decisiones tomadas al ejecutar, para que el reviewer no las lea como desvíos:

- `productFormSchema` vive en el mismo `product.schema.ts`, derivado de
  `createProductSchema` con `.omit({priceCents, compareAtPriceCents})`: el
  formulario captura los precios en soles como string y el schema los convierte
  a centavos. La API sigue aceptando solo enteros, como pide el AC4.
- `formatCents()` agrupa con `es-ES` y antepone `S/` en vez de usar
  `style: "currency"`: `es-PE` produce `S/ 1,234.56`, no el `S/ 1.234,56` del AC9.
  Todo el cálculo es aritmética entera; no hay `cents / 100` en el camino.
- El 409 de SKU se devuelve con `jsonError(409, SKU_TAKEN_MESSAGE)` en vez de
  `throw new SlugConflictError(...)`: `api-error.ts` se reutiliza sin tocarlo y
  el mensaje queda distinto del de slug (AC3).
- No hay `product-status-badge.tsx`: el estado usa `Badge` directamente, como
  única diferencia con 001, porque las etiquetas cambian
  ("Publicado/Despublicado" vs. "Activa/Inactiva").
- `CATEGORY_OPTIONS_QUERY` es un objeto de módulo en `constants.ts` para que la
  query key del `Select` de categorías sea estable y la comparta toolbar y
  formulario, sin duplicar los parámetros.
- Corrección iteración 1: `MAX_CENTS` era `999_999_999_9` (9.999.999.999), 4,6×
  por encima del máximo del `integer` de Postgres, así que un precio alto pasaba
  Zod y desbordaba en el insert → 500 opaco. Ahora `MAX_CENTS = 999_999_999`
  (S/ 9.999.999,99) y `AMOUNT_INPUT_PATTERN` admite 7 dígitos enteros, no 9:
  el tope del formulario (`9999999.99`) da exactamente `MAX_CENTS`, de modo que
  form y API rechazan lo mismo y nada por encima de `2_147_483_647` llega a la
  columna. Verificado con `curl`: `priceCents` de 3.000.000.000 y de 2.147.483.648
  y `compareAtPriceCents` de 5.000.000.000 devuelven `400` con `issues` en POST y
  en PATCH; `999999999` sigue dando `201`.

## Historial de revisión

### Iteración 1/3 — hallazgo del `reviewer` corregido

| Hallazgo | Corrección |
|---|---|
| **[MAYOR]** `MAX_CENTS` en `product.schema.ts:5` era `999_999_999_9` (9.999.999.999), 4,6× por encima del máximo del `integer` de Postgres (`2_147_483_647`) de `price_cents`. Un precio alto pasaba la validación Zod y desbordaba en el insert → `500` opaco en vez del `400` que exige el AC4 | `MAX_CENTS` baja a `999_999_999` (S/ 9.999.999,99) en `product.schema.ts:8`. `AMOUNT_INPUT_PATTERN` en `format.ts:17` pasa de 9 a 7 dígitos enteros (`^\d{1,7}(?:[.,]\d{1,2})?$`), así el tope del formulario (`9999999.99`) da exactamente `MAX_CENTS`: form y API rechazan lo mismo y nada por encima de `2_147_483_647` llega a la columna |

### Iteración 2/3 — verificación del `reviewer`: APROBADO

| Verificado | Evidencia |
|---|---|
| Batería completa | `npm run typecheck`, `npm run lint`, `npm run build` en verde (build: 10 rutas, sin warnings propios) |
| Fix del MAYOR | Contra la app corriendo (Neon real, no mock): `POST /api/products` con `priceCents: 3000000000` → `400 { issues: [{ path: "priceCents", message: "El precio supera el máximo permitido." }] }`. `priceCents: 2147483648` (int32 + 1) → mismo `400` controlado. `compareAtPriceCents: 5000000000` → `400` con issue propio en `compareAtPriceCents`. `PATCH` con `priceCents: 3000000000` sobre un producto existente → mismo `400`, no `500` |
| Límite exacto no roto | `POST` con `priceCents: 999999999` (`MAX_CENTS`, el tope que produce el input al escribir `9999999.99`) → `201`, producto creado y luego soft-deleted para no ensuciar el seed |
| Alcance de la re-revisión | Limitada a Paso 1 (mecánico) y a los dos archivos del hallazgo (`product.schema.ts`, `format.ts`), por protocolo de iteración 2; el resto del audit de iteración 1 no se reabrió |

## Deuda abierta

1. **Sin auth ni autorización** (misma decisión que 001): los 5 endpoints quedan abiertos
   y `/admin/products` es navegable sin sesión. `developer` no añade guards y `reviewer`
   no lo reporta como hallazgo en este spec. Lo cierra el spec de auth/RBAC.
2. Búsqueda `ILIKE '%…%'` (Deuda 2 de 001): con volumen de catálogo, evaluar `pg_trgm`
   en un spec propio. No se resuelve aquí.
3. `PageMeta` queda duplicado en `modules/categories/types/category.ts` y `src/types/api.ts`;
   migrar categorías al tipo compartido es tarea de un spec de limpieza.
4. Diferido: `product_images` + uploader, `currency`, variantes, control de stock real,
   productos en el storefront, tests (sin runner instalado).
