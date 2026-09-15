// Pruebas unitarias de src/server/checkout/resolve-cart.ts — bloqueadas.
//
// BLOQUEO: doble. (1) El archivo abre con `import "server-only"`, que lanza en
// el propio import bajo `tsx --test` ("This module cannot be imported from a
// Client Component module"); verificado con un import real. Arrastra además a
// `lib/stripe.ts` y a `product.repository.ts`, ambos con el mismo marcador.
// (2) A diferencia de `toOrderSummary`, aquí la impureza sí es de la función:
// `resolveCartForPayment` existe precisamente para releer precio, stock y
// disponibilidad de cada línea desde la base —esa relectura es la defensa
// contra un carrito manipulado en el cliente— y llama a
// `productRepository.findManyActiveByIds` sin recibirlo por parámetro. Su
// núcleo no se puede ejercitar sin datos reales, y un repositorio falso está
// prohibido por la política del loop.
// DESBLOQUEO (fuera de alcance): dos caminos, ninguno gratis. Pruebas de
// integración contra una Postgres desechable (con el segundo runner del punto 2
// de la escalación), o extraer el armado puro —`buildLineItem`, el total y el
// mapeo de faltantes a `ConflictError`— a un módulo sin `server-only` que
// reciba las filas ya leídas, dejando en `resolveCartForPayment` solo la
// lectura. Ese trozo extraído sería puro y testeable de inmediato.
// La allowlist de imágenes que usa para armar el line item (`isAllowedImageUrl`)
// sí es pura y ya está cubierta con 26 tests reales en `lib/image-hosts.test.ts`.
import { describe, it } from "node:test";

describe("resolveCartForPayment", () => {
  it.todo("re-reads price, stock and availability of every cart line from the database and builds the Stripe and order line items, throwing ConflictError when something is unavailable");
});
