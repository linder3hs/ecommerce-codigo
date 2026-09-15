// Pruebas unitarias de src/server/repositories/role.repository.ts — bloqueadas.
//
// BLOQUEO: doble. (1) El archivo abre con `import "server-only"`, que lanza en
// el propio import bajo `tsx --test` ("This module cannot be imported from a
// Client Component module"); verificado con un import real. (2) Los seis
// métodos son consultas Drizzle contra `getDb()`, resuelto dentro del módulo y
// sin punto de inyección. El agrupado en memoria de `listWithPermissions` sí
// sería una transformación testeable, pero no está expuesto: vive dentro del
// método, después del `leftJoin`, y solo se alcanza teniendo filas reales.
// `replacePermissions` y `assignToUser` son borrar+reinsertar dentro de una
// transacción: su corrección es la atomicidad, que ningún doble reproduce.
// Fabricar un `db` falso está prohibido por la política del loop.
// DESBLOQUEO (fuera de alcance): pruebas de integración contra una Postgres
// desechable en un script aparte, con el segundo runner del punto 2 de la
// escalación. Alternativa menor y de bajo riesgo: extraer el agrupado de filas
// del `leftJoin` a una función pura exportada —`(rows) => RoleWithPermissions[]`—
// que se testearía de inmediato sin tocar la arquitectura.
import { describe, it } from "node:test";

describe("roleRepository.listWithPermissions", () => {
  it.todo("lists every role with its permissions grouped in memory from a leftJoin");
});

describe("roleRepository.findByUserId", () => {
  it.todo("returns the single role assigned to a user");
});

describe("roleRepository.findBySlug", () => {
  it.todo("finds a role by its stable slug");
});

describe("roleRepository.findById", () => {
  it.todo("finds a role by id");
});

describe("roleRepository.replacePermissions", () => {
  it.todo("replaces a role's whole permission set by deleting and reinserting");
});

describe("roleRepository.assignToUser", () => {
  it.todo("replaces the role assigned to a user, removing the previous one");
});
