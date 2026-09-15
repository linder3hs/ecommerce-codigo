// Pruebas unitarias de src/modules/products/services/public-product.service.ts — bloqueadas.
//
// BLOQUEO: el módulo importa la instancia `api` de `@/lib/axios`, un singleton
// creado en tiempo de import y sin punto de inyección de transporte. Smoke-check
// con un import real bajo `tsx`: el módulo carga sin romper, así que lo que
// falta es la costura, no el runner. Las dos funciones son passthrough de esa
// instancia (armar `params`/URL y devolver `data`/`data.data`); su única lógica
// propia —el `encodeURIComponent` del slug y el mapeo de 404 a `null` vía
// `validateStatus`, que es lo que distingue "slug inexistente" de "falló la
// red"— solo se observa a través de una respuesta HTTP, así que ejercitarla
// exigiría una pieza falsa (adapter de axios sustituido o servidor de mentira),
// prohibido por la política del loop.
// DESBLOQUEO (fuera de alcance): recibir el cliente HTTP como parámetro/factory
// en vez de importarlo, o extraer el mapeo de status a una función pura
// testeable aparte —compartida con `checkoutService`, que repite el mismo
// patrón en dos métodos—.
import { describe, it } from "node:test";

describe("publicProductService.list", () => {
  it.todo("GET /storefront/products with the given query parameters");
});

describe("publicProductService.getBySlug", () => {
  it.todo("GET of the public product detail by slug, returning null on 404 instead of throwing");
});
