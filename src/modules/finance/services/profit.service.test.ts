// Pruebas unitarias de src/modules/finance/services/profit.service.ts — bloqueadas.
//
// BLOQUEO: el mismo que el de `revenue.service.test.ts`. El módulo importa la
// instancia `api` de `@/lib/axios`, un singleton creado en tiempo de import y sin
// punto de inyección de transporte. `report` es passthrough —pasar el rango como
// `params` y devolver `data`— sin una sola decisión propia: lo único afirmable
// sería "se llamó a axios", y verificarlo exigiría una pieza falsa (adapter
// sustituido o servidor de mentira), prohibido por la política del loop.
// DESBLOQUEO (fuera de alcance): recibir el cliente HTTP como parámetro/factory
// en vez de importarlo.
// SÍ CUBIERTO en otro sitio: el cálculo del reporte vive en funciones puras con
// test propio —`profit.test.ts` (utilidad, serie y COGS desconocido),
// `tax.test.ts` (neto e IGV) y `margin.test.ts` (margen)— y el contrato de la
// query en el schema de historial de órdenes.
import { describe, it } from "node:test";

describe("profitService.report", () => {
  it.todo(
    "GET /admin/finance/profit with from and to as query parameters, returning the bare ProfitReport without unwrapping",
  );
});
