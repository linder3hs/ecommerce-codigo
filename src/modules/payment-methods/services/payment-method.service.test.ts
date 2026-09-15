// Pruebas unitarias de src/modules/payment-methods/services/payment-method.service.ts — bloqueadas.
//
// BLOQUEO: el módulo importa la instancia `api` de `@/lib/axios`, un singleton
// creado en tiempo de import y sin punto de inyección de transporte. Las cuatro
// funciones son passthrough de esa instancia (armar la URL y devolver
// `data.data` / `data.url`); su única lógica propia —el `encodeURIComponent`
// del id— solo se observa a través de la petición HTTP que sale, así que
// ejercitarla exigiría una pieza falsa (adapter de axios sustituido o servidor
// de mentira), prohibido por la política del loop. DESBLOQUEO (fuera de alcance
// de este loop): recibir el cliente HTTP como parámetro/factory en vez de
// importarlo, o extraer la construcción de la URL a una función pura testeable
// aparte. Verificado con un import real bajo `tsx`: el módulo carga sin romper
// y expone `paymentMethodService`, así que lo que falta es la costura, no el
// runner.
import { describe, it } from "node:test";

describe("paymentMethodService.list", () => {
  it.todo("GET /payment-methods");
});

describe("paymentMethodService.createSetupSession", () => {
  it.todo("POST /payment-methods/setup-session, returning the hosted Stripe URL");
});

describe("paymentMethodService.setDefault", () => {
  it.todo("PATCH /payment-methods/:id/default");
});

describe("paymentMethodService.remove", () => {
  it.todo("DELETE /payment-methods/:id");
});
