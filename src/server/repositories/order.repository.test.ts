// Pruebas unitarias de src/server/repositories/order.repository.ts — bloqueadas.
//
// BLOQUEO: doble. (1) El archivo abre con `import "server-only"`, que lanza en
// el propio import bajo `tsx --test` ("This module cannot be imported from a
// Client Component module"); verificado con un import real. (2) Los catorce
// métodos son consultas Drizzle contra `getDb()`, resuelto dentro del módulo y
// sin punto de inyección útil: que varios reciban un `db`/`tx` como parámetro
// no lo cambia, porque el marcador `server-only` bloquea el import del módulo
// antes de poder pasárselo y un doble de Drizzle sigue prohibido. Lo que más
// valdría fijar aquí es justamente lo menos aislable: la atomicidad de
// `createPending` (orden + líneas en una sola transacción), la idempotencia de
// `markPaid` guardada con `status <> 'paid'`, el `decrementStock` que descuenta
// por línea y devuelve las que se quedaron cortas, y el batch de
// `findManyByUserInRange` que evita el N+1. Del listado admin, lo mismo: que el
// `count` de `list` comparta innerJoin y WHERE con las filas, que
// `findByIdWithItemsForAdmin` no filtre por dueño y que la guarda
// `expectedStatus` de `setStatus` viva en el WHERE. Todo eso es
// comportamiento de la base, no del código: verificarlo exigiría una Postgres
// real o un doble de Drizzle, prohibido por la política del loop. El único
// cálculo puro del archivo, `totalCents` (línea 67), no se exporta y la política
// prohíbe testear helpers privados.
// DESBLOQUEO (fuera de alcance): pruebas de integración contra una Postgres
// desechable en un script aparte, con el segundo runner del punto 2 de la
// escalación. Alternativa menor: exportar `totalCents` —suma pura de
// `unitPriceCents * qty`— para cubrir el cálculo del total sin tocar la base.
import { describe, it } from "node:test";

describe("orderRepository.createPending", () => {
  it.todo("creates a pending order with its items in a single transaction, computing totalCents");
});

describe("orderRepository.createPendingForPaymentIntent", () => {
  it.todo("creates a pending order without stripeCheckoutSessionId for the saved-card path");
});

describe("orderRepository.findBySessionId", () => {
  it.todo("finds an order with its items by stripeCheckoutSessionId");
});

describe("orderRepository.findManyByUserInRange", () => {
  it.todo("returns the user's purchase history within an instant range, resolving items in batch without N+1");
});

describe("orderRepository.findByIdForUser", () => {
  it.todo("finds an order by id restricted to its owner");
});

describe("orderRepository.findByIdForUserWithItems", () => {
  it.todo("finds an order by id restricted to its owner, including its line items");
});

describe("orderRepository.list", () => {
  it.todo(
    "filters admin orders by closed [dateFrom, dateTo] range, status and ilike over customer email/firstName/lastName, orders by createdAt desc and paginates with limit/offset",
  );
  it.todo(
    "returns a count computed with the same innerJoin and WHERE as the rows, so total matches the filtered set and not the whole table",
  );
});

describe("orderRepository.findByIdWithItemsForAdmin", () => {
  it.todo(
    "finds an order by id regardless of its userId (no owner guard), including the customer summary and its line items",
  );
});

describe("orderRepository.markPaid", () => {
  it.todo("idempotently marks an order as paid by stripeCheckoutSessionId, guarding on status <> paid");
});

describe("orderRepository.markPaidByPaymentIntent", () => {
  it.todo("marks an order as paid locating it by id for the PaymentIntent path");
});

describe("orderRepository.markPaymentFailedByPaymentIntent", () => {
  it.todo("marks a pending order as payment_failed by id without overwriting an already stored paymentIntentId when none is provided");
});

describe("orderRepository.markPaymentFailed", () => {
  it.todo("marks a pending order as payment_failed by stripeCheckoutSessionId");
});

describe("orderRepository.setStatus", () => {
  it.todo(
    "updates the status inside the caller's transaction and returns the updated row when expectedStatus matches the stored one",
  );
  it.todo(
    "returns null without writing when the stored status no longer matches expectedStatus (race with the Stripe webhook), because the guard lives in the WHERE",
  );
});

describe("orderRepository.decrementStock", () => {
  it.todo("decrements stock per line inside a transaction and returns the lines whose stock fell short");
});
