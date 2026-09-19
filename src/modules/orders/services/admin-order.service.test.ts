// Pruebas unitarias de src/modules/orders/services/admin-order.service.ts — bloqueadas.
//
// BLOQUEO: el módulo importa la instancia `api` de `@/lib/axios`, un singleton
// creado en tiempo de import y sin punto de inyección de transporte. Smoke-check
// con un import real bajo `tsx`: el módulo carga y exporta sus tres métodos
// (`list`, `detail`, `updateStatus`), así que lo que falta es la costura, no el
// runner. Los tres son passthrough de esa instancia y su lógica propia solo se
// observa fuera del proceso: en `list`, que axios serialice los `Date` de
// `dateFrom`/`dateTo` como ISO 8601 —justo lo que `adminOrderQuerySchema` vuelve
// a coercionar en el servidor— y que `page`/`pageSize`/`status`/`customerSearch`
// viajen como query string, es comportamiento del serializador de axios visible
// únicamente en la petición saliente; en `detail` y `updateStatus`, el
// `encodeURIComponent(id)` de la URL y el desenvuelto de `data.data` piden una
// respuesta HTTP para afirmarse, igual que el body `{ status, expectedStatus }`
// del PATCH y el 409 que el interceptor de `@/lib/axios` convierte en `Error`
// cuando el webhook de Stripe movió la orden entre medio. Cualquiera de esos
// asertos exige interceptar el transporte —adapter sustituido o servidor de
// mentira—, es decir una pieza falsa, prohibida por la política del loop.
// DESBLOQUEO (fuera de alcance): recibir el cliente HTTP como parámetro/factory
// en vez de importarlo. El contrato de ida y vuelta de las fechas también se
// cubriría probando `adminOrderQuerySchema` contra cadenas ISO, que sí es puro.
import { describe, it } from "node:test";

describe("adminOrderService.list", () => {
  it.todo(
    "GET /admin/orders with the given query parameters (page, pageSize, status, dateFrom/dateTo as ISO 8601, customerSearch), returning the wrapper with `meta`",
  );
});

describe("adminOrderService.detail", () => {
  it.todo(
    "GET /admin/orders/:id with the id URL-encoded, unwrapping `data.data`",
  );
});

describe("adminOrderService.updateStatus", () => {
  it.todo(
    "PATCH /admin/orders/:id/status with the body { status, expectedStatus }, unwrapping `data.data`",
  );
});
