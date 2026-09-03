import type { PublicProductQueryInput } from "@/modules/products/schemas/public-product.schema";
import type { PublicProduct } from "@/modules/products/types/public-product";

/**
 * Selectores puros del bento. Todas las islas de la landing consumen la misma
 * consulta y reparten sus filas desde acá: así el hero, la grilla y el buscador
 * comparten una entrada de caché en vez de pedir tres veces lo mismo.
 *
 * Nada de esto toca React ni la red: son funciones sobre el array ya cargado.
 */

// Objeto de módulo para que la query key sea estable entre renders. 48 es el
// tope del schema público y hoy alcanza para todo el catálogo.
export const LANDING_PRODUCTS_QUERY: PublicProductQueryInput = {
  page: 1,
  pageSize: 48,
  sortBy: "createdAt",
  sortDir: "desc",
};

export const MAX_SEARCH_RESULTS = 4;

export const SEARCH_DEBOUNCE_MS = 300;

export const AUTOPLAY_MS = 5600;

// Primer paint del contador: el deadline se fija en un efecto tras montar, así
// que en servidor no hay una cuenta que pudiera diferir de la del cliente.
export const COUNTDOWN_PLACEHOLDER = "--:--:--";

export const OFFERS_WINDOW_SECONDS = 8079;

export function isOffer(product: PublicProduct): boolean {
  return (
    product.compareAtPriceCents !== null &&
    product.compareAtPriceCents > product.priceCents
  );
}

export function isSoldOut(product: PublicProduct): boolean {
  return product.stock <= 0;
}

/**
 * Porcentaje de descuento redondeado, sin pasar por un precio decimal: todo el
 * cálculo es sobre los centavos enteros y la única división es la final,
 * truncada. `(2·x + d) / 2d` truncado es `x/d` redondeado al entero más
 * cercano, con x = diferencia · 100.
 */
export function discountPercent(product: PublicProduct): number | null {
  const compare = product.compareAtPriceCents;

  if (compare === null || compare <= product.priceCents) {
    return null;
  }

  const scaledDiff = (compare - product.priceCents) * 100;

  return Math.trunc((scaledDiff * 2 + compare) / (compare * 2));
}

export function discountLabel(product: PublicProduct): string | null {
  const percent = discountPercent(product);

  return percent === null ? null : `-${percent} %`;
}

export function stockNote(product: PublicProduct): string {
  return isSoldOut(product) ? "Agotado" : `${product.stock} en stock`;
}

/** Línea corta bajo el nombre: la categoría hace de "spec" del diseño. */
export function productSpec(product: PublicProduct): string {
  return product.description?.trim() || product.category.name;
}

export function selectOffers(products: PublicProduct[]): PublicProduct[] {
  return products.filter(isOffer);
}

/** Los slides del hero son las ofertas; sin ofertas, los primeros productos. */
export function selectHeroSlides(products: PublicProduct[]): PublicProduct[] {
  const offers = selectOffers(products);

  return offers.length > 0 ? offers : products.slice(0, 4);
}

/**
 * Spotlight: el producto sin descuento más caro. Es la tarjeta vertical con
 * foto a sangre, así que se reserva para el producto aspiracional; si todo el
 * catálogo está en oferta, cae en el más caro a secas.
 */
export function selectSpotlight(
  products: PublicProduct[],
): PublicProduct | null {
  const candidates = products.filter((product) => !isOffer(product));
  const pool = candidates.length > 0 ? candidates : products;

  return pool.reduce<PublicProduct | null>(
    (best, product) =>
      best === null || product.priceCents > best.priceCents ? product : best,
    null,
  );
}

/** Destacado ancho: la oferta con mayor descuento; si no hay, el más caro. */
export function selectWide(products: PublicProduct[]): PublicProduct | null {
  const offers = selectOffers(products);
  const pool = offers.length > 0 ? offers : products;

  return pool.reduce<PublicProduct | null>((best, product) => {
    if (best === null) {
      return product;
    }

    const current = discountPercent(product) ?? 0;
    const top = discountPercent(best) ?? 0;

    return current > top ? product : best;
  }, null);
}

/** Miniaturas: lo que queda después del spotlight y del destacado ancho. */
export function selectThumbs(
  products: PublicProduct[],
  exclude: (PublicProduct | null)[],
): PublicProduct[] {
  const excludedIds = new Set(
    exclude.filter((product) => product !== null).map((product) => product.id),
  );

  return products
    .filter((product) => !excludedIds.has(product.id))
    .slice(0, 3);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Segundos → "HH:MM:SS". Negativo se satura en cero, nunca cuenta al revés. */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.trunc(totalSeconds));

  return [
    pad(Math.trunc(seconds / 3600)),
    pad(Math.trunc((seconds % 3600) / 60)),
    pad(seconds % 60),
  ].join(":");
}

export function secondsUntil(deadlineMs: number, nowMs: number): number {
  return Math.max(0, Math.trunc((deadlineMs - nowMs) / 1000));
}
