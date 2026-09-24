// Pruebas unitarias de src/modules/finance/services/tax.service.ts — bloqueadas.
//
// BLOQUEO: el mismo que el de `revenue.service.test.ts`. El módulo importa la
// instancia `api` de `@/lib/axios`, un singleton creado en tiempo de import y sin
// punto de inyección de transporte. `report` es passthrough —pasar `params` y
// devolver `data`— sin una sola decisión propia: lo único afirmable sería "se
// llamó a axios", y verificarlo exigiría una pieza falsa (adapter sustituido o
// servidor de mentira), prohibido por la política del loop.
// DESBLOQUEO (fuera de alcance): recibir el cliente HTTP como parámetro/factory
// en vez de importarlo.
// SÍ CUBIERTO en otro sitio: el cálculo del reporte vive en funciones puras con
// test propio —`tax-periods.test.ts` (claves, límites, relleno en cero, `partial`
// y redondeo por periodo) y `tax.test.ts` (neto e IGV)—.
import { describe, it } from "node:test";

describe("taxService.report", () => {
  it.todo(
    "GET /admin/finance/tax with from, to and period as query parameters, returning the bare TaxReport without unwrapping",
  );
});
