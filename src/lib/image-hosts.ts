/**
 * Fuente de verdad de los hosts de imagen aceptados. La consumen las tres
 * capas: `remotePatterns` en `next.config.ts`, la validación Zod de `imageUrl`
 * (productos y categorías) y `ProductPhoto`. `image_url` lo escribe cualquier
 * rol con `products.update`, así que sin allowlist la landing pública cargaría
 * contenido de orígenes arbitrarios.
 *
 * Sumar un proveedor nuevo exige editar este archivo y desplegar.
 */
export const ALLOWED_IMAGE_HOSTS = [
  "images.unsplash.com",
  "pe.tiendasishop.com",
  // CDN de imágenes de catálogo de Amazon: sirve JPEG público, sin auth ni
  // referer. Cubre la foto real de producto del seed mientras el catálogo sea
  // de demo; en producción la foto se sube a Blob y este host sale.
  "m.media-amazon.com",
] as const;

/** Para mensajes de error dirigidos a quien carga productos desde el panel. */
export const ALLOWED_IMAGE_HOSTS_LABEL = ALLOWED_IMAGE_HOSTS.join(", ");

export const IMAGE_URL_HOST_MESSAGE = `La URL de imagen debe ser https y de un host permitido: ${ALLOWED_IMAGE_HOSTS_LABEL}.`;

export function isAllowedImageUrl(value: string): boolean {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  return (
    url.protocol === "https:" &&
    (ALLOWED_IMAGE_HOSTS as readonly string[]).includes(url.hostname)
  );
}
