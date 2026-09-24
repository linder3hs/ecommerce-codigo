// Pruebas unitarias de src/server/repositories/finance.repository.ts — bloqueadas.
//
// BLOQUEO: doble, el mismo de `dashboard.repository.test.ts`. (1) El archivo
// abre con `import "server-only"`, que lanza en el propio import bajo
// `tsx --test` ("This module cannot be imported from a Client Component
// module"). (2) Las consultas son agregaciones Drizzle contra `getDb()`,
// resuelto dentro del módulo y sin punto de inyección: lo que habría que fijar
// —que solo cuenta `status = 'paid'`, el intervalo semiabierto `[from, to)`, el
// día civil de Lima con `at time zone 'America/Lima'`, el desglose sin filtro de
// borrado lógico y el recorte por `LIMIT`— es comportamiento de Postgres, no del
// código, y observarlo exigiría una base real o un doble de Drizzle, prohibido
// por la política del loop.
//
// Lo que sí queda cubierto por pruebas: el neto y el IGV en
// `src/modules/finance/lib/tax.test.ts`; el relleno de la serie, la fila "Otros"
// y la reconciliación del bruto (AC4, AC5) en
// `src/modules/finance/lib/revenue-series.test.ts`; el rango en
// `src/modules/finance/schemas/revenue.schema.test.ts`.
//
// DESBLOQUEO (fuera de alcance): pruebas de integración contra una Postgres
// desechable en un script aparte, con un segundo runner por el marcador
// `server-only`. El caso que más importa ahí es el de zona horaria: una orden
// pagada a las 23:00 de Lima cuenta en ese día, no en el día UTC siguiente.
import { describe, it } from "node:test";

describe("revenueScope", () => {
  it.todo(
    "matches only paid orders created in the half-open interval [fromInstant, toInstant), excluding pending and payment_failed (AC2)",
  );
});

describe("financeRepository.sumRevenueByDay", () => {
  it.todo(
    "sums total_cents per Lima civil day within the scope, ascending, reusing the same storeDay expression in SELECT, GROUP BY and ORDER BY",
  );
});

describe("financeRepository.sumRevenueTotals", () => {
  it.todo(
    "returns the gross and the order count from orders and the units from order_items joined to orders under the same scope, zeros when empty",
  );
});

describe("financeRepository.sumRevenueBreakdown", () => {
  it.todo(
    "groups by product or category with the label from the join, keeps soft-deleted products and categories (AC6), orders by gross desc with a stable tie-break and applies the limit",
  );
});

// Ganancias (020). Mismo bloqueo `server-only` + `getDb()` sin inyección. Lo
// puro —el merge de la serie, `cogsOrUnknown` y la fórmula de la utilidad— está
// cubierto en `src/modules/finance/lib/profit.test.ts`.
describe("financeRepository.sumCogsTotals", () => {
  it.todo(
    "sums qty × unit_cost_cents only over lines with a frozen cost and, in the same pass, the qty of lines with a null cost, under the revenue scope after joining orders (AC2, AC4)",
  );
});

describe("financeRepository.sumCogsByDay", () => {
  it.todo(
    "groups the same COGS aggregation by the shared storeDay instance in SELECT, GROUP BY and ORDER BY so its keys match sumRevenueByDay character by character",
  );
});

describe("financeRepository.sumProfitByProduct", () => {
  it.todo(
    "groups by product with the label from the join, keeps soft-deleted and inactive products, returns units, gross, COGS and unitsWithoutCost, orders by gross desc with a stable tie-break and applies the limit",
  );
});
