// Pruebas unitarias de src/server/repositories/dashboard.repository.ts — bloqueadas.
//
// BLOQUEO: doble, el mismo de `order.repository.test.ts`. (1) El archivo abre
// con `import "server-only"`, que lanza en el propio import bajo `tsx --test`
// ("This module cannot be imported from a Client Component module"); verificado
// importando el módulo real. (2) Los tres métodos son consultas Drizzle
// agregadas contra `getDb()`, resuelto dentro del módulo y sin punto de
// inyección: lo que habría que fijar —el agrupado por día civil UTC con
// `to_char(... at time zone 'UTC')`, la suma solo de `status = 'paid'`, el
// filtro `deleted_at is null` del stock bajo y el recorte por `LIMIT`— es
// comportamiento de Postgres, no del código, y observarlo exigiría una base
// real o un doble de Drizzle, prohibido por la política del loop. El único
// valor puro del archivo, la expresión `utcDay`, no se exporta y la política
// prohíbe testear helpers privados; su SQL se verificó fuera de la suite con
// `.toSQL()` (GROUP BY y ORDER BY reutilizan la misma instancia de la
// expresión que el SELECT).
//
// Lo que sí queda cubierto por pruebas: el relleno de las series y la forma de
// las claves `YYYY-MM-DD` en UTC, en `src/modules/dashboard/lib/series.test.ts`.
// La alineación entre esas claves y las del repositorio es por construcción
// —ambas son el día civil UTC—, no por ejecución.
//
// DESBLOQUEO (fuera de alcance): pruebas de integración contra una Postgres
// desechable en un script aparte, que además necesita un segundo runner por el
// marcador `server-only`. Ahí el caso que más importa es el de zona horaria:
// una orden pagada a las 23:00 UTC-05 debe contarse en el día UTC siguiente.
import { describe, it } from "node:test";

describe("dashboardRepository.sumPaidTotalsByDay", () => {
  it.todo(
    "sums total_cents of paid orders created since a given instant, grouped by UTC civil day, ascending, casting the bigint sum to number",
  );
});

describe("dashboardRepository.countOrdersByStatus", () => {
  it.todo(
    "counts orders grouped by status, returning only the statuses present in the data",
  );
});

describe("dashboardRepository.findLowStockProducts", () => {
  it.todo(
    "returns active, non soft-deleted products with stock <= threshold ordered by stock asc and capped by limit",
  );
});
