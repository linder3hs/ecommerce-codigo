// Pruebas unitarias de src/modules/finance/services/expense.service.ts — bloqueadas.
//
// BLOQUEO: el mismo que el de `unit-price.service.test.ts`. El módulo importa la
// instancia `api` de `@/lib/axios`, un singleton creado en tiempo de import y sin
// punto de inyección de transporte. Los cuatro métodos son passthrough —pasar
// `params`, concatenar el id, mandar el body y devolver `data`— sin una sola
// decisión propia: lo único afirmable sería "se llamó a axios", y verificarlo
// exigiría una pieza falsa (adapter sustituido o servidor de mentira), prohibido
// por la política del loop. Un test así fijaría la implementación, no el
// comportamiento.
// DESBLOQUEO (fuera de alcance): recibir el cliente HTTP como parámetro/factory
// en vez de importarlo.
// SÍ CUBIERTO en otro sitio: lo afirmable de esta pantalla vive en los esquemas
// Zod, probados en `schemas/expense.schema.test.ts` (monto en centavos > 0,
// rango de fechas, PATCH con al menos un campo), y en `toCents`/`formatCents`,
// probados en `lib/format.test.ts`.
import { describe, it } from "node:test";

describe("expenseService.list", () => {
  it.todo(
    "GET /admin/finance/expenses with page, pageSize, category, dateFrom and dateTo as query parameters",
  );
});

describe("expenseService.create", () => {
  it.todo(
    "POST /admin/finance/expenses with the body as is, returning the bare ExpenseRow",
  );
});

describe("expenseService.update", () => {
  it.todo(
    "PATCH /admin/finance/expenses/:id sending description: null verbatim so the handler clears it instead of leaving it untouched",
  );
});

describe("expenseService.remove", () => {
  it.todo("DELETE /admin/finance/expenses/:id resolving with no body on 204");
});
