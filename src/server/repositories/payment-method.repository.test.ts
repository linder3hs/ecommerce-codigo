// Pruebas unitarias de src/server/repositories/payment-method.repository.ts — bloqueadas.
//
// BLOQUEO: doble. (1) El archivo abre con `import "server-only"`, que lanza en
// el propio import bajo `tsx --test` ("This module cannot be imported from a
// Client Component module"); verificado con un import real. (2) Los cinco
// métodos son consultas Drizzle contra `getDb()`, resuelto dentro del módulo y
// sin punto de inyección. Las reglas que importan son transaccionales y viven en
// la base: el upsert idempotente por `stripePaymentMethodId`, que la primera
// tarjeta de un usuario quede por defecto, que `setDefault` desmarque la
// anterior en la misma transacción y que `deleteForUser` promueva la más
// reciente cuando se borra la predeterminada. Ninguna se observa sin una
// Postgres real, y fabricar un `db` falso lo prohíbe la política del loop.
// DESBLOQUEO (fuera de alcance): pruebas de integración contra una Postgres
// desechable en un script aparte, con el segundo runner del punto 2 de la
// escalación. La capa de presentación de la tarjeta —`lib/card-display.ts` y la
// proyección Zod `toPaymentMethod`— sí es pura y ya está cubierta con 47 tests
// reales, incluido el recorte de `stripePaymentMethodId` hacia el cliente.
import { describe, it } from "node:test";

describe("paymentMethodRepository.findManyByUser", () => {
  it.todo("lists the user's cards, most recent first");
});

describe("paymentMethodRepository.findByIdForUser", () => {
  it.todo("finds a card by id restricted to its owner");
});

describe("paymentMethodRepository.upsertFromStripe", () => {
  it.todo("idempotently creates or updates a card from a Stripe event and marks the user's first card as default");
});

describe("paymentMethodRepository.setDefault", () => {
  it.todo("marks a card as default and unmarks the previous one in the same transaction");
});

describe("paymentMethodRepository.deleteForUser", () => {
  it.todo("deletes a user's card and promotes the most recent remaining one when the deleted card was the default");
});
