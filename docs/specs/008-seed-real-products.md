---
id: 008
title: Seed de catálogo real — 5+ productos por categoría con imágenes verificadas
status: done
module: products
scope: both
---

# 008 — Seed de catálogo real con imágenes verificadas

## Objetivo

Un visitante puede recorrer `/` y `/products` con al menos 5 productos reales por
categoría, cada uno con marca/modelo existentes y foto real accesible.

## Alcance

Incluye:

- 30 productos en `PRODUCT_SEEDS` (5 por cada una de las 6 categorías del seed).
- Imágenes reales de producto (foto del producto, no foto de stock genérica).
- Un host nuevo en la allowlist de imágenes.
- Hacer el seed de productos idempotente-actualizador (reejecutar corrige datos).

No incluye:

- Cambios de esquema (`brand`, galería multi-imagen, variantes). El nombre sigue
  llevando la marca, como ya hace el seed actual y asumió el spec 005.
- Descargar imágenes a `public/` ni subirlas a Blob.
- Nuevas categorías: se usan las 6 de `CATEGORY_SEEDS`.
- Tocar repositorios, API, hooks o componentes.

## Criterios de aceptación

- [x] AC1 — Dado `npm run db:seed` en una BD limpia, cuando termina, entonces cada una de las 6 categorías tiene ≥ 5 productos.
- [x] AC2 — Dado cualquier producto sembrado, entonces `name` nombra una marca y modelo reales (p. ej. "Monitor LG UltraGear 27GP850"), y `sku` y `slug` son únicos.
- [x] AC3 — Dada cada `imageUrl` del seed, cuando se solicita por HTTPS, entonces responde `200` con `content-type: image/*` y su host está en `ALLOWED_IMAGE_HOSTS`.
- [x] AC4 — Dado un `priceCents`, entonces es entero ≥ 0 en centavos de sol y coherente con el precio de mercado del modelo; `compareAtPriceCents` es `null` o mayor que `priceCents`.
- [x] AC5 — Dado `npm run db:seed` ejecutado dos veces, entonces no hay filas duplicadas y la segunda corrida actualiza `imageUrl`, `priceCents`, `compareAtPriceCents`, `stock` y `description` de los slugs ya existentes.
- [x] AC6 — Dado el catálogo sembrado, entonces se conservan los casos de prueba de los specs 004/005: ≥ 1 producto con `stock = 0`, ≥ 1 con `isActive = false` y ≥ 8 con `compareAtPriceCents`.
- [x] AC7 — Dado `/products` en el navegador, cuando carga la grilla, entonces ninguna tarjeta cae al marcador de `ProductPhoto` y no hay error de `next/image` por host no configurado.

## Datos

Sin cambios de esquema. Solo filas en `products` (`name`, `slug`, `sku`,
`description`, `price_cents`, `compare_at_price_cents`, `stock`, `category_id`,
`image_url`, `is_active`). Sin migración.

Reparto por categoría (5 c/u), marcas sugeridas — el developer confirma modelo y
precio reales al buscar la foto:

- `laptops` — Dell XPS, Lenovo IdeaPad/Legion, ASUS ZenBook, HP Victus, Acer Aspire.
- `teclados` — Keychron K2, Logitech MX Keys, Razer BlackWidow, Redragon Kumara, HyperX Alloy.
- `monitores` — LG UltraGear, Samsung Odyssey, Dell UltraSharp, ASUS TUF Gaming, AOC 24".
- `audio` — Sony WH-1000XM5, JBL Tune, Logitech G Pro X, HyperX Cloud II, Blue Yeti / Fifine.
- `almacenamiento` — Samsung 980 Pro, WD Black SN770, Kingston NV2, Crucial P3, Seagate One Touch.
- `accesorios-descontinuados` — mouse/hub/webcam de gama baja reales; categoría inactiva, sirve de dato de prueba.

Convención de `sku`: prefijo de categoría existente (`LAP-`, `TEC-`, `MON-`,
`AUD-`, `ALM-`, `ACC-`) + modelo. Los 8 slugs ya sembrados se conservan tal cual;
solo cambian sus datos.

## API

Sin cambios de API ni de schemas Zod. La validación de host de
`productSchema.imageUrl` ya cubre las URLs nuevas vía `isAllowedImageUrl`.

## Reutilizar

- `src/lib/image-hosts.ts` — única fuente de la allowlist; `next.config.ts` deriva
  `images.remotePatterns` de ella, **no se edita**.
- `src/server/db/seed.ts` — `CATEGORY_SEEDS`, tipo `ProductSeed`, resolución de
  `categoryId` por slug y el patrón de `onConflict` con predicado parcial.
- `src/server/db/schema/product.ts` — checks de `price_cents`/`stock` ≥ 0 y los
  índices únicos parciales sobre `slug` y `sku`.
- `src/modules/storefront/components/product-photo.tsx` — ya filtra hosts; nada que crear.

Sin componentes shadcn nuevos.

## Tareas

- [x] T1 — Añadir `m.media-amazon.com` a `ALLOWED_IMAGE_HOSTS` y actualizar el comentario de la lista · `src/lib/image-hosts.ts`
- [x] T2 — Buscar y validar por `curl -o /dev/null -w "%{http_code} %{content_type}"` las 30 URLs (200 + `image/*`) antes de escribirlas; descartar las que fallen · sin archivo
- [x] T3 — Reescribir `PRODUCT_SEEDS` con las 30 entradas, conservando los 8 slugs existentes · `src/server/db/seed.ts`
- [x] T4 — Cambiar el insert de productos a `onConflictDoUpdate` sobre `slug` con el mismo predicado parcial · `src/server/db/seed.ts`
- [x] T5 — Ejecutar `npm run db:seed` dos veces y pegar en el PR los conteos por categoría · sin archivo

Verificación final: `npm run typecheck && npm run lint` (el `build` lo corre el reviewer)

## Notas

- El índice único de `products.slug` es **parcial** (`where deleted_at is null`):
  en `onConflictDoUpdate` el predicado va en `targetWhere`, no en `setWhere`. Si
  se omite, Postgres no infiere el índice y el seed revienta.
- Ampliar la allowlist agranda la superficie de contenido remoto en la landing
  pública. Se elige un solo host (`m.media-amazon.com`, verificado: sirve JPEG
  sin auth ni referer) en lugar de un CDN por marca.
- Las URLs de imagen de terceros pueden caducar. Cuando el catálogo salga de
  demo, la ruta es subir la foto a Vercel Blob, como ya anotó el spec 004.
- Sustituciones de modelo respecto a la lista sugerida, porque el sugerido ya no
  tiene ficha vigente con foto verificable: Kingston NV2 → **NV3 1TB**,
  Crucial P3 → **P310 1TB**, Redragon K552 → **K552P Kumara** (evita además el
  `+` en la ruta de la imagen). El inactivo pasó del disco Seagate al combo
  Logitech MK120, dentro de la categoría ya inactiva, para que las cinco
  categorías visibles tengan 5 productos publicados.
