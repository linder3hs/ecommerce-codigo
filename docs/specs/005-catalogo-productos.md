---
id: 005
title: Catálogo de productos y CTAs de la landing
status: done
module: products
scope: client
---

# 005 — Catálogo de productos y CTAs de la landing

## Objetivo

Un visitante puede abrir `/products` desde cualquier CTA de la landing y filtrar,
ordenar y paginar el catálogo real con la URL como único estado compartible.

## Alcance

Incluye:

- Página `/products` con sidebar de filtros, orden, grilla paginada y estado vacío.
- Filtros: búsqueda, categoría, rango de precio, con stock, en oferta.
- Estado en `searchParams` (link compartible + deep-link desde la landing).
- Conectar los CTAs muertos de la landing a `/products` con sus filtros.

No incluye:

- `/products/[slug]` (ficha de producto): las tarjetas siguen agregando al carrito.
- Filtro por **marca** del mockup: `products` no tiene columna `brand` (ver `src/server/db/schema/product.ts`). Se omite; no se crea la columna en este spec.
- Multi-selección de categoría: `listPublic` filtra por un slug. Los chips son single-select (segundo click deselecciona).
- Favoritos, infinite scroll, prefetch en servidor.

## Criterios de aceptación

- [ ] AC1 — Dado `/products` sin filtros, cuando carga, entonces muestra 12 productos activos y "N de M productos".
- [ ] AC2 — Dado un chip de categoría, cuando se activa, entonces la URL pasa a `?category=<slug>`, la grilla refiltra y recargar la página conserva el filtro.
- [ ] AC3 — Dado un chip de precio, cuando se activa, entonces solo aparecen productos con `priceCents` dentro del rango.
- [ ] AC4 — Dado "Con stock" activo, entonces no aparece ningún producto con `stock = 0`.
- [ ] AC5 — Dado el select de orden en "Mayor descuento", entonces los productos con mayor % de descuento van primero y los sin `compareAtPriceCents` al final.
- [ ] AC6 — Dada una combinación sin resultados, entonces se ve la tarjeta "Nada con estos filtros" con botón que limpia todo.
- [ ] AC7 — Dado `totalPages > 1`, cuando se pulsa "Siguiente", entonces la URL pasa a `?page=2` y la grilla muestra la página 2.
- [ ] AC8 — La grilla tiene estado de carga (skeletons) y de error con reintento.
- [ ] AC9 — Dado un click en un icono de categoría de la landing, entonces navega a `/products?category=<slug>`.
- [ ] AC10 — Dado un click en la flecha de "Más productos" o en "Ver todo" del catálogo mobile, entonces navega a `/products`.
- [ ] AC11 — Dado un click en la tarjeta de Ofertas, entonces navega a `/products?deals=1`.
- [ ] AC12 — Dado texto en el buscador de la nav, cuando se pulsa Enter o "Ver todos los resultados", entonces navega a `/products?q=<texto>`.

## Datos

Sin cambios de esquema. Sin migración.

## API

| Método | Ruta                       | Auth    | Body | Response                                    |
| ------ | -------------------------- | ------- | ---- | ------------------------------------------- |
| GET    | `/api/storefront/products` | pública | —    | `{ data: PublicProduct[], meta: PageMeta }` |

El Route Handler (`src/app/api/storefront/products/route.ts`) **no se toca**: parsea
`publicProductQuerySchema`. Solo se extiende el schema:

`publicProductQuerySchema` — campos nuevos:

- `minPriceCents` · coerce number · int · min 0 · optional
- `maxPriceCents` · coerce number · int · min 0 · optional
- `inStock` · enum `"true" | "false"` → boolean · optional (mismo patrón que `onlyOffers`)
- `PUBLIC_PRODUCT_SORT_FIELDS` suma `"discount"`

Mapa searchParams de `/products` → params de API (helper de T3):

| URL                                                            | API                               |
| -------------------------------------------------------------- | --------------------------------- |
| `q`                                                            | `search`                          |
| `category`                                                     | `categorySlug`                    |
| `price` = `lt500` \| `500-1500` \| `1500-4000` \| `gt4000`     | `minPriceCents` / `maxPriceCents` |
| `stock=1`                                                      | `inStock`                         |
| `deals=1`                                                      | `onlyOffers`                      |
| `sort` = `newest` \| `price-asc` \| `price-desc` \| `discount` | `sortBy` + `sortDir`              |
| `page`                                                         | `page` (pageSize fijo 12)         |

## Reutilizar

- `src/modules/products/hooks/use-public-products.ts` — `usePublicProducts`, ya con `keepPreviousData`.
- `src/modules/categories/hooks/use-public-categories.ts` — chips de categoría.
- `src/modules/storefront/lib/styles.ts` — `CARD`, `CIRC`, `CIRC_DARK`, `PILL`, `PILL_QUIET`, `TAG`, `LIFT`, `ZOOM`, `MONO`, `FOCUS_RING`. El chip del mockup (`.chip` / `.chip-on`) no existe: agregar `CHIP` y `CHIP_ON` a este archivo, no clases sueltas.
- `src/modules/storefront/lib/landing.ts` — `isSoldOut`, `discountLabel`, `stockNote`, `productSpec`.
- `src/modules/storefront/components/product-photo.tsx`, `storefront-error.tsx`, `storefront-nav.tsx`.
- `src/modules/cart/components/cart-drawer.tsx` + `src/modules/cart/store/cart-store.ts` — carrito tal cual; no reconstruir el drawer del mockup.
- `src/lib/format.ts` — `formatCents`.
- `src/components/ui/select.tsx`, `skeleton.tsx` — ya instalados. Sin `npx shadcn add`.

## Tareas

- [x] T1 — Añadir `minPriceCents`, `maxPriceCents`, `inStock` y sort `discount` · `src/modules/products/schemas/public-product.schema.ts`
- [x] T2 — Aplicar rango de precio y `stock > 0` en `buildPublicFilters`, y orden por descuento en `listPublic` · `src/server/repositories/product.repository.ts`
- [x] T3 — Constantes de rangos/orden y conversión searchParams ⇄ `PublicProductQueryInput` · `src/modules/storefront/lib/catalog.ts`
- [x] T4 — Añadir `CHIP` y `CHIP_ON` · `src/modules/storefront/lib/styles.ts`
- [x] T5 — `CatalogFilters` (categoría, precio, disponibilidad, botón Limpiar) · `src/modules/storefront/components/catalog-filters.tsx`
- [x] T6 — `CatalogToolbar` (título, "N de M productos", select de orden) · `src/modules/storefront/components/catalog-toolbar.tsx`
- [x] T7 — `CatalogProductCard` (foto, badge de descuento, spec, stock, precio, botón agregar) · `src/modules/storefront/components/catalog-product-card.tsx`
- [x] T8 — `CatalogGrid` (grilla 3 col, skeletons, error, vacío, paginación anterior/siguiente) · `src/modules/storefront/components/catalog-grid.tsx`
- [x] T9 — `CatalogView` isla cliente: lee `useSearchParams`, escribe con `router.replace`, llama `usePublicProducts` · `src/modules/storefront/components/catalog-view.tsx`
- [x] T10 — Página `/products`: `StorefrontNav` + `<Suspense>` + `CatalogView` + `CartDrawer` + `metadata` · `src/app/(storefront)/products/page.tsx`
- [x] T11 — Categorías clicables y flecha de "Más productos" como `Link` · `src/modules/storefront/components/landing-bento.tsx`
- [x] T12 — "Ver todo" en el catálogo mobile hacia `/products` · `src/modules/storefront/components/landing-bento.tsx`
- [x] T13 — Tarjeta de ofertas como `Link` a `/products?deals=1` · `src/modules/storefront/components/offers-countdown.tsx`
- [x] T14 — Enter y fila "Ver todos los resultados" hacia `/products?q=` · `src/modules/storefront/components/storefront-search.tsx`

Verificación final: `npm run typecheck && npm run lint`

## Notas

- `useSearchParams` obliga a envolver `CatalogView` en `<Suspense>` o el build de la página falla.
- Orden `discount`: no cabe en `PUBLIC_SORT_COLUMNS` (es `Record<field, PgColumn>`). Usar una rama aparte con expresión `sql` sobre `1 - price_cents / compare_at_price_cents` y `NULLS LAST`; no romper el mapa existente.
- Cambiar cualquier filtro debe resetear `page` a 1, o se cae en una página vacía.
- Escribir la URL con `router.replace` + `scroll: false`: cada chip no debe dejar una entrada en el historial.
