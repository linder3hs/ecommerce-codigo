// Pruebas unitarias de src/server/repositories/user.repository.ts — bloqueadas.
//
// BLOQUEO: doble. (1) El archivo abre con `import "server-only"`, que lanza en
// el propio import bajo `tsx --test` ("This module cannot be imported from a
// Client Component module"); verificado con un import real. (2) Los nueve
// métodos son consultas Drizzle contra `getDb()`, resuelto dentro del módulo y
// sin punto de inyección. Las dos reglas que de verdad importan son de
// concurrencia y viven en la base: la idempotencia de `upsertByClerkId` frente
// a webhooks repetidos de Clerk y el `setStripeCustomerId` que solo escribe
// cuando la columna era NULL para no pisar una carrera. Un doble de Drizzle no
// puede reproducir ninguna de las dos —diría que se llamó al doble, no que la
// carrera se resolvió— y además está prohibido por la política del loop.
// DESBLOQUEO (fuera de alcance): pruebas de integración contra una Postgres
// desechable, incluyendo un caso con dos escrituras concurrentes del
// `stripeCustomerId`, en un script aparte y con el segundo runner del punto 2
// de la escalación.
import { describe, it } from "node:test";

describe("userRepository.upsertByClerkId", () => {
  it.todo("idempotently creates or updates the local users mirror from a Clerk webhook");
});

describe("userRepository.findByClerkId", () => {
  it.todo("finds a user by clerkId");
});

describe("userRepository.findByIdWithRole", () => {
  it.todo("finds a user by id together with their role");
});

describe("userRepository.list", () => {
  it.todo("lists paginated users with search, status and role filters, resolving the role through a leftJoin");
});

describe("userRepository.countByRole", () => {
  it.todo("counts users grouped by role");
});

describe("userRepository.countByStatus", () => {
  it.todo("counts active versus inactive users");
});

describe("userRepository.findStripeCustomerId", () => {
  it.todo("reads a user's stripeCustomerId");
});

describe("userRepository.setStripeCustomerId", () => {
  it.todo("stores the stripeCustomerId only when the column was NULL, avoiding overwriting a concurrent race");
});

describe("userRepository.setActive", () => {
  it.todo("activates or deactivates a user");
});
