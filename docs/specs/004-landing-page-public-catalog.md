---
id: 004
title: Landing page pública y API de catálogo
status: done
module: shared
scope: client
---

# 004 — Landing page pública y API de catálogo

## Objetivo
Un visitante sin sesión abre `/` y ve el bento de `docs/design/Main.dc.html` con
productos y categorías reales de la BD, puede buscar y armar un carrito local.

## Alcance
Incluye: landing en `/` (desktop 1440 + mobile 390), endpoints públicos de
lectura de productos y categorías, carrusel de ofertas, buscador, carrito
Zustand en memoria, tokens visuales del storefront.
No incluye: `Catalogo.dc.html`, `/products/[slug]`, carrito en BD, checkout,
órdenes, auth del storefront, favoritos (el corazón queda decorativo).

## Criterios de aceptación
- [x] AC1 — Dado un visitante sin sesión, cuando abre `/`, entonces ve nav, hero, categorías, spotlight, thumbs, ofertas y destacado ancho con datos de la BD.
- [x] AC2 — Dado `GET /api/storefront/products`, cuando responde 200, entonces ninguna fila trae `sku`, `isActive`, `deletedAt`, `createdAt`, `updatedAt` ni `categoryId`, y ninguna es inactiva o borrada.
- [x] AC3 — Dado `GET /api/products` sin sesión, entonces responde 401 (la lectura admin deja de ser pública).
- [x] AC4 — Dado el hero, cuando pasan 5,6 s o se pulsa una flecha/punto, entonces cambia de oferta con la transición de la nota MOTION y el autoplay se reinicia tras la acción manual.
- [x] AC5 — Dado el buscador, cuando el visitante escribe, entonces tras 300 ms aparece el panel con máximo 4 resultados del servidor, o "Nada para X".
- [x] AC6 — Dado un producto agregado, entonces el badge del carrito hace `bump`, el drawer lista las líneas y el total se calcula sumando centavos enteros.
- [x] AC7 — Dado stock 0, entonces la tarjeta muestra "Agotado" y el botón de agregar queda deshabilitado.
- [x] AC8 — Dada cualquier isla que consuma datos, entonces tiene skeleton mientras carga y mensaje con reintento si falla.
- [x] AC9 — Dado un viewport de 390 px, entonces se ve el layout de `Mobile.dc.html` (barra inferior flotante, bottom sheet) sin scroll horizontal.
- [x] AC10 — Dado el toggle de tema, entonces la landing conmuta claro/oscuro sin parpadeo ni error de hidratación.

## Datos
Sin cambios de esquema. Todo sale de `products` y `categories` (7 productos, 6
categorías; 1 producto y 1 categoría inactivos, que la API pública excluye).

Proyección pública — producto: `id`, `name`, `slug`, `description`,
`priceCents`, `compareAtPriceCents`, `stock`, `imageUrl`, `category {id, name, slug}`.
Proyección pública — categoría: `id`, `name`, `slug`, `imageUrl`.

## API
| Método | Ruta | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/api/storefront/products` | pública | — | `{ data: PublicProduct[], meta: PageMeta }` |
| GET | `/api/storefront/categories` | pública | — | `{ data: PublicCategory[] }` |
| GET | `/api/products` | `products.read` | — | sin cambios (deja de ser pública) |
| GET | `/api/categories` | `categories.read` | — | sin cambios (deja de ser pública) |

Zod `publicProductQuerySchema`: `search?` (≤100), `categorySlug?`, `onlyOffers?`
("true"/"false"), `page` (1), `pageSize` (12, máx 48), `sortBy`
(`name|priceCents|createdAt`), `sortDir`.
Zod `publicCategoryQuerySchema`: sin parámetros por ahora — se valida el objeto vacío.

Rutas nuevas, no un flag sobre las existentes: la proyección, el filtro forzado
`isActive = true` y el cacheo son distintos, y un `if (public)` dentro del
handler admin haría que un bug de rama filtre columnas internas. `src/proxy.ts`
ya deja pasar todo `/api(.*)` sin sesión (la autorización vive en el handler),
así que no hay que tocar el matcher; sí hay que agregar `requirePermission` a
los dos GET admin, que hoy están abiertos.

## Reutilizar
- `src/lib/format.ts` — `formatCents` para todo precio. No se copia.
- `src/lib/api-error.ts` — `handleApiError`; `src/lib/permissions.ts` — `PERMISSIONS`, `requirePermission`.
- `src/server/repositories/product.repository.ts` / `category.repository.ts` — se extienden con `listPublic`, reusando `alive()` y el `innerJoin` que ya evita el N+1.
- `src/lib/axios.ts` (`api`), `src/types/api.ts` (`PageMeta`), `src/hooks/use-debounce.ts`.
- `src/modules/products/{services,hooks,types}` — se copia el patrón de `product.service.ts` / `use-products.ts`, no el contenido.
- `src/components/providers/theme-provider.tsx` (next-themes ya montado) y `src/components/ui/{sheet,skeleton,input,button,badge,separator}.tsx`.
- Instalar: `npx shadcn@latest add scroll-area`.
- Imágenes: `next/image` contra `images.unsplash.com`. `docs/design/img/` es referencia, no se copia a `public/`.

## Tareas
- [x] T1 — `remotePatterns` para `images.unsplash.com` · `next.config.ts`
- [x] T2 — Tokens del storefront (`--page`, `--sunk`, `--brand`, `--on-brand`, radio 28 px, sombras) bajo la clase `.storefront` + registro en `@theme inline` · `src/app/globals.css`
- [x] T3 — `productRepository.listPublic` con proyección pública, `isActive = true` y filtro por `categorySlug`/`onlyOffers` · `src/server/repositories/product.repository.ts`
- [x] T4 — `categoryRepository.listPublic` (solo activas, ordenadas por `name`) · `src/server/repositories/category.repository.ts`
- [x] T5 — `publicProductQuerySchema` · `src/modules/products/schemas/public-product.schema.ts`
- [x] T6 — `publicCategoryQuerySchema` · `src/modules/categories/schemas/public-category.schema.ts`
- [x] T7 — `GET` público de productos + header `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` · `src/app/api/storefront/products/route.ts`
- [x] T8 — `GET` público de categorías, mismo header · `src/app/api/storefront/categories/route.ts`
- [x] T9 — `requirePermission` en los dos GET admin y actualizar el comentario que dice que son públicos · `src/app/api/products/route.ts`, `src/app/api/categories/route.ts`
- [x] T10 — Tipos públicos derivados del schema Drizzle · `src/modules/products/types/public-product.ts`, `src/modules/categories/types/public-category.ts`
- [x] T11 — Services axios · `src/modules/products/services/public-product.service.ts`, `src/modules/categories/services/public-category.service.ts`
- [x] T12 — Hooks TanStack Query + query keys · `src/modules/products/hooks/use-public-products.ts`, `src/modules/categories/hooks/use-public-categories.ts`
- [x] T13 — Selectores puros del bento (ofertas, spotlight, wide, thumbs, `% off`, nota de stock) · `src/modules/storefront/lib/landing.ts`
- [x] T14 — Store Zustand del carrito (`items`, `add`, `setQty`, `count`, `subtotalCents`) · `src/modules/cart/store/cart-store.ts`
- [x] T15 — Drawer del carrito sobre `ui/sheet` · `src/modules/cart/components/cart-drawer.tsx`
- [x] T16 — Nav en tres píldoras: logo, buscador con debounce y panel de resultados, carrito, tema, ingresar · `src/modules/storefront/components/storefront-nav.tsx`
- [x] T17 — Hero carousel con `AnimatePresence` + `key`, puntos, flechas y autoplay de 5,6 s · `src/modules/storefront/components/hero-carousel.tsx`
- [x] T18 — Tarjetas del bento (categorías, spotlight, thumbs, contador de ofertas, destacado ancho) · `src/modules/storefront/components/landing-bento.tsx`
- [x] T19 — Layout del storefront: clase `.storefront`, fondo `--page`, sin el header global · `src/app/(storefront)/layout.tsx`
- [x] T20 — Página raíz Server Component que compone las islas; borrar `src/app/page.tsx` y sacar el header de Clerk de `src/app/layout.tsx` · `src/app/(storefront)/page.tsx`
- [x] T21 — Variante mobile de `Mobile.dc.html`: barra inferior flotante, bottom sheet, carrusel de catálogo con `scroll-snap` · archivos de T16–T18

Verificación final: `npm run typecheck && npm run lint && npm run build` — los
tres en verde. Smoke test en el navegador a 1440×900 y 390×844: sin errores de
consola, sin scroll horizontal, carrito y buscador operativos en ambos anchos.

Archivos de apoyo creados fuera de la lista literal de tareas, todos consumidos
por T15–T21:

- `src/modules/storefront/lib/styles.ts` — las cuatro formas repetidas del
  diseño (tarjeta, botón circular, píldora, etiqueta) en un solo lugar.
- `src/modules/storefront/components/product-photo.tsx` — equivalente de
  `Photo.dc.html` sobre `next/image`, con marcador cuando `image_url` es null.
- `src/modules/storefront/components/storefront-error.tsx` — estado de error con
  reintento del AC8, compartido por hero, bento y buscador.
- `src/modules/storefront/components/theme-toggle.tsx` y
  `storefront-search.tsx` — islas del nav (T16) separadas por responsabilidad.
- `src/modules/storefront/components/offers-countdown.tsx` — la tarjeta de T18
  que posee el temporizador.
- `src/hooks/use-media-query.ts` — transversal, ya previsto en `docs/SETUP.md`;
  decide si el carrito entra por la derecha o sube como bottom sheet.

## Notas
- **`swiper` es prescindible.** El hero son 4 slides sin track horizontal: el
  texto y la foto entran por separado (`sl-*` / `ph-*`), con puntos y flechas
  propios. Eso es `AnimatePresence` + `key`, exactamente lo que dice la nota
  MOTION. `swiper` traería su CSS y su propio dueño del DOM para pelearse con
  eso. Propuesta: instalar solo `npm i motion` y resolver el scroll horizontal
  del mobile con `scroll-snap-type` de CSS. Si al aprobar preferís `swiper`,
  decilo y se agrega en T17.
- **No se toca `--radius` global.** El admin depende de los 10 px de shadcn; los
  28 px viven en el scope `.storefront`. Y el token se llama `--brand`, no
  `--accent`: shadcn ya usa `--accent` para hovers y pisarlo rompería los
  botones dentro del storefront.
- **Contador de ofertas.** Calcular el deadline en render provoca desajuste de
  hidratación. Se fija en un `useEffect` tras montar y el primer paint muestra
  `--:--:--`.
- **Sin prefetch SSR en esta fase.** La landing es Server Component pero los
  datos entran por islas cliente, porque la regla 1 prohíbe que un componente
  toque el repositorio. El `HydrationBoundary` con prefetch queda para el spec
  del catálogo, donde el SEO sí pesa.
- **Altas de dependencias.** Solo dos, ambas previstas al aprobar: `motion`
  (hero con `AnimatePresence` + `key`, badge `bump`, entrada `rise` de las
  tarjetas) y el componente `scroll-area` de shadcn (lista del carrito y panel
  de resultados). No se instaló `swiper`: el carrusel del mobile es
  `scroll-snap` de CSS.
- No se invocó ninguna skill: el repo ya tiene patrones vigentes de handler,
  service y hook para copiar.
- **Allowlist de hosts de imagen (corrección de review, iteración 1).**
  `src/lib/image-hosts.ts` es la única fuente de verdad y la consumen las tres
  capas: `remotePatterns` en `next.config.ts`, la validación Zod de `imageUrl`
  (productos y categorías, que además exige `https:`) y `ProductPhoto`, que
  dibuja el marcador cuando el host no está permitido en vez de degradar a
  `unoptimized`. Hosts actuales: `images.unsplash.com` (seed) y
  `pe.tiendasishop.com` (producto cargado desde el panel).
  Costo aceptado: **sumar un proveedor de imágenes nuevo obliga a tocar código y
  desplegar**; quien carga productos no puede habilitarlo desde el panel. El
  mensaje de error del formulario nombra los hosts aceptados para que ese límite
  sea legible sin leer el código.
- **Deuda para una fase futura.** La solución de fondo no es la allowlist sino
  subir la imagen a Vercel Blob desde el panel y guardar la URL propia, en vez
  de guardar URLs externas. Eso elimina la allowlist, el `remotePatterns`
  abierto por host y la dependencia de que un tercero mantenga la foto viva.
- **Filas heredadas fuera de la allowlist.** La lectura no pasa por el schema de
  escritura, así que no rompen la landing. Pero la categoría `Mouse` tiene
  `image_url` en `m.media-amazon.com`: editarla desde el panel falla en el campo
  imagen hasta que se reemplace la URL. Está reportado, no tapado.
