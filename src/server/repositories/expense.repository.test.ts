// Pruebas unitarias de src/server/repositories/expense.repository.ts — bloqueadas.
//
// BLOQUEO: doble, el mismo que `category.repository.test.ts`. (1) El archivo
// abre con `import "server-only"`, que lanza en el propio import bajo
// `tsx --test` ("This module cannot be imported from a Client Component
// module"). (2) Los cinco métodos son consultas Drizzle contra `getDb()` o contra
// el `tx` de quien llama, sin lógica aislable: lo que valdría la pena fijar —el
// filtro `alive()`, el rango de fechas inclusivo, el orden por
// `expense_date desc, created_at desc`, el `FOR UPDATE` que da un `before`
// exacto y el `softDelete` que escribe `deletedAt` sin borrar la fila— solo se
// observa contra una base real. Fabricar un `db` falso está prohibido por la
// política del loop.
// DESBLOQUEO (fuera de alcance): pruebas de integración contra una Postgres
// desechable en un script aparte.
// SÍ CUBIERTO en otro sitio: el nombre del autor sale de `formatCustomerName`,
// con test propio en `lib/format`.
import { describe, it } from "node:test";

describe("expenseRepository.list", () => {
  it.todo(
    "lists live expenses paginated, filtered by category and an inclusive date range, ordered by expense_date desc then created_at desc, with createdByName resolved through an innerJoin",
  );
});

describe("expenseRepository.findById", () => {
  it.todo("finds a live expense by id with the same joined row as list");
});

describe("expenseRepository.create", () => {
  it.todo("inserts an expense inside the caller transaction");
});

describe("expenseRepository.update", () => {
  it.todo(
    "locks the live row FOR UPDATE, updates it and returns before/after, or not_found",
  );
});

describe("expenseRepository.softDelete", () => {
  it.todo(
    "locks the live row FOR UPDATE and sets deletedAt instead of physically deleting it, or not_found",
  );
});

// Ganancias (020). Mismo bloqueo `server-only` + `getDb()` sin inyección.
describe("expenseRepository.sumExpenseTotals", () => {
  it.todo(
    "sums amount_cents of live expenses with expense_date between from and to, both ends included, ignoring soft-deleted rows (AC6)",
  );
});

describe("expenseRepository.sumExpensesByDay", () => {
  it.todo(
    "groups the same live, inclusive-range sum by expense_date ascending, keyed by the YYYY-MM-DD string without any time zone conversion",
  );
});
