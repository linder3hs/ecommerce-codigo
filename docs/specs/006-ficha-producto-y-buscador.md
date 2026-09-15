---
id: 006
title: Ficha de producto y navegación desde el buscador
status: done
module: storefront
scope: client
---

# 006 — Ficha de producto y navegación desde el buscador

## Objetivo
Un visitante puede abrir `/products/[slug]` para ver la ficha completa de un producto
y agregarlo al carrito, y llega ahí desde el buscador en vez de agregarlo a ciegas.

## Alcance
Incluye:
- Página pública `/products/[slug]` con foto, nombre, categoría, precio, precio comparado, descuento, stock, descripción y alta al carrito.
- Endpoint público `GET /api/storefront/products/[slug]` + repo, service y hook.
- Buscador: el click en un resultado navega (nunca agrega al carrito).

No incluye: reseñas, galería multi-imagen, productos relacionados, stepper de cantidad
(spec 007), `generateMetadata` dinámica, enlace desde la tarjeta del catálogo.

## Criterios de aceptación
- [ ] AC1 — Dado un slug de producto publicado, cuando abro `/products/[slug]`, entonces veo nav, ficha completa y drawer de carrito del storefront.
- [ ] AC2 — Dado un producto con `compareAtPriceCents` mayor al precio, cuando veo la ficha, entonces veo el precio tachado y el badge de descuento (`discountLabel`).
- [ ] AC3 — Dado un producto con `stock = 0`, cuando veo la ficha, entonces el botón "Agregar al carrito" está deshabilitado y se lee "Agotado".
- [ ] AC4 — Dado un slug inexistente, despublicado, borrado o de categoría despublicada, cuando abro la ruta, entonces veo un bloque "Producto no encontrado" con enlace a `/products` (sin error rojo ni pantalla en blanco).
- [ ] AC5 — Dado que la ficha carga, cuando presiono "Agregar al carrito", entonces el badge de la nav sube en 1.
- [ ] AC6 — Dado que escribí un texto en el buscador y el panel muestra resultados, cuando hago click en uno, entonces navego y **no** se agrega nada al carrito.
- [ ] AC7 — Dado que el texto normalizado es igual al nombre normalizado del resultado, **o** el panel devolvió un único resultado, cuando hago click, entonces voy a `/products/<slug>`.
- [ ] AC8 — Dado que hay varios resultados y ninguno coincide exacto, cuando hago click en uno, entonces voy a `/products?q=<texto>`.
- [ ] AC9 — Dado el panel abierto, cuando navego desde un resultado, entonces el panel se cierra (desktop y mobile).

## Datos
Sin cambios de esquema. `products.description` (`text`, nullable) ya existe y es el
cuerpo de la ficha; si es `null` no se renderiza el bloque.

## API
| Método | Ruta | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/api/storefront/products/[slug]` | pública | — | `200 { data: PublicProduct }` · `404 { message }` · `400` slug inválido |

Cache-Control idéntico al del listado público: `public, s-maxage=60, stale-while-revalidate=300`.

Zod (`public-product.schema.ts`): `publicProductSlugSchema` — string, trim, max 180,
regex kebab-case `^[a-z0-9]+(?:-[a-z0-9]+)*$` (mismo patrón que `categorySlug`).

## Reutilizar
- `src/server/repositories/product.repository.ts` — `buildPublicFilters()` y la proyección de `listPublic()`; `PublicProductRow` ya está exportado.
- `src/modules/products/types/public-product.ts` — `PublicProduct`, sin tipo nuevo.
- `src/modules/storefront/lib/landing.ts` — `isSoldOut`, `discountLabel`, `stockNote`, `productSpec`.
- `src/modules/storefront/lib/styles.ts` — `CARD`, `PILL`, `PILL_BRAND`, `MONO`, `TAG`, `LIFT`.
- `src/modules/storefront/components/product-photo.tsx`, `storefront-error.tsx`, `storefront-nav.tsx`.
- `src/modules/cart/store/cart-store.ts` — `useCartStore(state => state.add)`; `src/modules/cart/components/cart-drawer.tsx`.
- `src/lib/format.ts` — `formatCents`. `src/lib/api-error.ts` — `NotFoundError`, `handleApiError`.
- `src/modules/storefront/lib/catalog.ts` — `CATALOG_PATH` para el href del catálogo.
- `src/app/(storefront)/products/page.tsx` — patrón de página (nav + vista + drawer).
- `src/components/ui/skeleton` ya instalado. No hace falta instalar componentes shadcn.

## Tareas
- [x] T1 — `findPublicBySlug(slug): Promise<PublicProductRow | null>` con el mismo `innerJoin` + `buildPublicFilters({})` y `eq(products.slug, slug)`, `limit(1)` · `src/server/repositories/product.repository.ts`
- [x] T2 — Exportar `publicProductSlugSchema` · `src/modules/products/schemas/public-product.schema.ts`
- [x] T3 — Route Handler `GET` con `RouteContext<"/api/storefront/products/[slug]">`, valida slug, 404 vía `NotFoundError` · `src/app/api/storefront/products/[slug]/route.ts`
- [x] T4 — `publicProductService.getBySlug(slug): Promise<PublicProduct | null>`; pasa `validateStatus: (s) => s === 200 || s === 404` y devuelve `null` en 404 · `src/modules/products/services/public-product.service.ts`
- [x] T5 — `usePublicProduct(slug)` + `publicProductKeys.detail(slug)` · `src/modules/products/hooks/use-public-product.ts`
- [x] T6 — `ProductDetail` presentacional (foto, badge de descuento, nombre, categoría, precios, stock, descripción, botón agregar) · `src/modules/storefront/components/product-detail.tsx`
- [x] T7 — `ProductDetailView` cliente: skeleton, `StorefrontError` con retry, bloque "no encontrado" y éxito · `src/modules/storefront/components/product-detail-view.tsx`
- [x] T8 — Página con `metadata` estática, `StorefrontNav`, `ProductDetailView` y `CartDrawer`; borrar `.gitkeep` · `src/app/(storefront)/products/[slug]/page.tsx`
- [x] T9 — `resolveSearchHref(query, product, resultCount): string` puro (normaliza: trim + lowercase + colapsar espacios + quitar diacríticos con `normalize("NFD").replace(/\p{Diacritic}/gu, "")`) · `src/modules/storefront/lib/search-target.ts`
- [x] T10 — En `SearchResults` reemplazar el `<button onClick={add}>` por `<Link href={resolveSearchHref(...)} onClick={onPicked}>` y quitar el import de `useCartStore` · `src/modules/storefront/components/storefront-search.tsx`

Verificación final: `npm run typecheck && npm run lint`

## Notas
- El interceptor de `src/lib/axios.ts` convierte el error de axios en un `Error` plano y pierde el status: por eso T4 resuelve el 404 con `validateStatus` en lugar de intentar leerlo del error.
- `retry: 1` es el default global; con T4 devolviendo `null` el 404 no reintenta.
- T1 reusa `buildPublicFilters` para no duplicar la regla "producto vivo y publicado **y** categoría viva y publicada": duplicarla dejaría fichas accesibles por URL tras despublicar una categoría.
- SEO: la ficha resuelve en cliente, así que el `<title>` es estático. Si se necesita indexación por producto, va en un spec aparte (SSR + `generateMetadata`).
