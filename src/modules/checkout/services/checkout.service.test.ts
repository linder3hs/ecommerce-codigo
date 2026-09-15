// Pruebas unitarias de src/modules/checkout/services/checkout.service.ts — bloqueadas.
//
// BLOQUEO: el módulo importa la instancia `api` de `@/lib/axios`, un singleton
// creado en tiempo de import y sin punto de inyección de transporte. Smoke-check
// con un import real bajo `tsx`: el módulo carga sin romper, así que lo que
// falta es la costura, no el runner. Los cuatro métodos son passthrough de esa
// instancia; su lógica propia se reduce a desenvolver la respuesta (`data.url`,
// `data.data`), al `encodeURIComponent` del id y al mapeo de 404 a `null` vía
// `validateStatus` —el mismo patrón que `publicProductService.getBySlug`,
// repetido en `getBySessionId` y `getById`—. Todo eso solo se observa a través
// de una respuesta HTTP, así que ejercitarlo exigiría una pieza falsa (adapter
// de axios sustituido o servidor de mentira), prohibido por la política del loop.
// DESBLOQUEO (fuera de alcance): recibir el cliente HTTP como parámetro/factory,
// o extraer el mapeo de status a una función pura compartida —ya son tres
// llamadas con el mismo `validateStatus` entre este archivo y
// `public-product.service.ts`, umbral suficiente para extraer sin romper DRY—.
import { describe, it } from "node:test";

describe("checkoutService.createSession", () => {
  it.todo("POST /checkout/session, returning the hosted Stripe Checkout URL");
});

describe("checkoutService.payWithSavedMethod", () => {
  it.todo("POST /checkout/pay with a saved card, returning the charge result");
});

describe("checkoutService.getBySessionId", () => {
  it.todo("GET /orders/by-session/:sessionId, returning null on 404");
});

describe("checkoutService.getById", () => {
  it.todo("GET /orders/:orderId, returning null on 404");
});
