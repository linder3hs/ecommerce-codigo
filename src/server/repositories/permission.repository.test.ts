// Pruebas unitarias de src/server/repositories/permission.repository.ts — bloqueadas.
//
// BLOQUEO: doble. (1) El archivo abre con `import "server-only"`, que lanza en
// el propio import bajo `tsx --test` ("This module cannot be imported from a
// Client Component module"); verificado con un import real. (2) Los tres
// métodos son consultas Drizzle contra `getDb()`, resuelto dentro del módulo y
// sin punto de inyección. `findCodesByClerkId` es la pieza sensible del RBAC
// —resuelve los códigos efectivos de un usuario activo encadenando
// users → user_roles → role_permissions → permissions en una sola consulta— y
// su corrección vive entera en los `join`/`where` de SQL: un doble de Drizzle
// solo verificaría que se llamó al doble, no que el permiso se resuelve bien.
// Fabricar ese doble está además prohibido por la política del loop.
// DESBLOQUEO (fuera de alcance): pruebas de integración contra una Postgres
// desechable con datos sembrados de roles y permisos, en un script aparte y con
// el segundo runner del punto 2 de la escalación. Por lo sensible del módulo,
// es el candidato más claro a cubrirse de verdad cuando exista esa infra.
import { describe, it } from "node:test";

describe("permissionRepository.listAll", () => {
  it.todo("lists every catalog permission ordered by resource and action");
});

describe("permissionRepository.findByCodes", () => {
  it.todo("finds permissions by a list of codes");
});

describe("permissionRepository.findCodesByClerkId", () => {
  it.todo("resolves an active user's effective permission codes by clerkId in a single query");
});
