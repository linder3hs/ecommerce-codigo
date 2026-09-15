import type { PublicProduct } from "@/modules/products/types/public-product";

import { CATALOG_PATH, productHref } from "./catalog";

/**
 * A dónde lleva el click en un resultado del buscador. Función pura y en su
 * propio archivo porque es la única decisión de la búsqueda que no es de
 * presentación, y así el panel de escritorio y el de mobile no la resuelven
 * cada uno a su manera.
 *
 * La regla: si el texto ya identifica al producto —coincide con su nombre o el
 * panel devolvió un único resultado— se va a la ficha; si hay varios candidatos
 * y ninguno coincide, se va al catálogo filtrado, que es donde la persona puede
 * comparar.
 */

/**
 * Comparación tolerante: minúsculas, sin espacios sobrantes y sin acentos.
 * "Teclado  MECÁNICO " y "teclado mecanico" tienen que ser el mismo texto o el
 * atajo a la ficha no se dispararía casi nunca.
 */
function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function resolveSearchHref(
  query: string,
  product: PublicProduct,
  resultCount: number,
): string {
  const text = normalize(query);

  if (resultCount === 1 || text === normalize(product.name)) {
    return productHref(product.slug);
  }

  return `${CATALOG_PATH}?q=${encodeURIComponent(query.trim())}`;
}
