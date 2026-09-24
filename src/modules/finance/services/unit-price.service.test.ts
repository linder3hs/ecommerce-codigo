// Pruebas unitarias de src/modules/finance/services/unit-price.service.ts — bloqueadas.
//
// BLOQUEO: el mismo que el de `product.service.test.ts`. El módulo importa la
// instancia `api` de `@/lib/axios`, un singleton creado en tiempo de import y sin
// punto de inyección de transporte. Los dos métodos son passthrough —pasar
// `params`, concatenar el id, mandar el body y devolver `data`— sin una sola
// decisión propia: lo único afirmable sería "se llamó a axios", y verificarlo
// exigiría una pieza falsa (adapter sustituido o servidor de mentira), prohibido
// por la política del loop. Un test así fijaría la implementación, no el
// comportamiento.
// DESBLOQUEO (fuera de alcance): recibir el cliente HTTP como parámetro/factory
// en vez de importarlo.
// SÍ CUBIERTO en otro sitio: la lógica de esta pantalla que se puede afirmar
// vive en funciones puras con test propio —`margin.test.ts` (el margen y su
// `null`) y `cost-redaction.test.ts` (la redacción del costo)— y en los esquemas
// Zod de `unit-price.schema.ts`, no en este passthrough.
import { describe, it } from "node:test";

describe("unitPriceService.list", () => {
  it.todo(
    "GET /admin/finance/unit-price with page, pageSize and search as query parameters",
  );
});

describe("unitPriceService.updateCost", () => {
  it.todo(
    "PATCH /admin/finance/unit-price/:id with the body { costCents }, returning the bare UnitPriceRow without unwrapping",
  );

  it.todo(
    "sends costCents: null verbatim so the handler reads it as an unknown cost, not as a missing field",
  );
});
