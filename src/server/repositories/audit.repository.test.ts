// Pruebas unitarias de src/server/repositories/audit.repository.ts — bloqueadas.
//
// BLOQUEO: doble. (1) El archivo abre con `import "server-only"`, que lanza en
// el propio import bajo `tsx --test` ("This module cannot be imported from a
// Client Component module"); verificado con un import real. (2) Aunque se
// saltara ese marcador, los tres métodos son consultas Drizzle resueltas contra
// `getDb()` —la conexión serverless a Neon, resuelta dentro del módulo y sin
// punto de inyección—: el `leftJoin` que resuelve el actor en `list`, la
// paginación y el `groupBy` de `countBySeverity` solo se observan contra una
// base real. `create` sí recibe la `Tx`, pero termina en un `insert` de Drizzle.
// Verificarlos exigiría una base de datos o un doble de Drizzle, prohibido por
// la política del loop. `buildFilters` no se exporta, así que tampoco se testea.
// DESBLOQUEO (fuera de alcance): esto no es trabajo de pruebas unitarias sino
// de integración contra una Postgres desechable (contenedor o rama efímera de
// Neon) en un script aparte, que además necesita el segundo runner del punto 2
// de la escalación por el marcador `server-only`.
import { describe, it } from "node:test";

describe("auditRepository.create", () => {
  it.todo("inserts an append-only audit_logs row using the received db/tx");
});

describe("auditRepository.list", () => {
  it.todo("lists paginated logs with filters (entityType, action, actorId, date range) and the actor resolved through a leftJoin");
});

describe("auditRepository.countBySeverity", () => {
  it.todo("counts logs grouped by severity since a given date");
});
