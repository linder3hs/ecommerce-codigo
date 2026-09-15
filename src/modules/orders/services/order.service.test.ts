// Pruebas unitarias de src/modules/orders/services/order.service.ts — bloqueadas.
//
// BLOQUEO: el módulo importa la instancia `api` de `@/lib/axios`, un singleton
// creado en tiempo de import y sin punto de inyección de transporte. Las dos
// funciones son passthrough de esa instancia (armar `params`/URL y devolver
// `data.data`); su única lógica propia —`encodeURIComponent` del id y el mapeo
// de 404 a `null` vía `validateStatus`— solo se observa a través de una
// respuesta HTTP, así que ejercitarla exigiría una pieza falsa (adapter de
// axios sustituido o servidor de mentira), prohibido por la política del loop.
// DESBLOQUEO (fuera de alcance de este loop): recibir el cliente HTTP como
// parámetro/factory en vez de importarlo, o extraer el mapeo de status a una
// función pura testeable aparte. Verificado con un import real bajo `tsx`: el
// módulo carga sin romper, lo que falta es la costura, no el runner.
import { describe, it } from "node:test";

describe("orderService.listGrouped", () => {
  it.todo("GET /orders for a date range, where the API already returns the history grouped by day");
});

describe("orderService.getReceiptUrl", () => {
  it.todo("GET /orders/:orderId/receipt, returning null on 404");
});
