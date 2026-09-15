// Pruebas unitarias de src/modules/roles/services/role.service.ts — bloqueadas.
//
// BLOQUEO: el módulo importa la instancia `api` de `@/lib/axios`, un singleton
// creado en tiempo de import y sin punto de inyección de transporte. Smoke-check
// con un import real bajo `tsx`: el módulo carga sin romper, así que lo que
// falta es la costura, no el runner. Los dos métodos son passthrough: un GET a
// una constante y un PATCH que concatena el id. La semántica peligrosa de
// `updatePermissions` —es un reemplazo total, el servidor revoca todo lo que no
// venga en `permissionIds`— la decide el handler y el repositorio, no este
// archivo; aquí no queda nada que afirmar sin una pieza falsa, prohibida por la
// política del loop.
// DESBLOQUEO (fuera de alcance): recibir el cliente HTTP como parámetro/factory.
// La prueba que de verdad haría falta para esta feature es de integración sobre
// `roleRepository.replacePermissions` (borrar+reinsertar en una transacción).
import { describe, it } from "node:test";

describe("roleService.list", () => {
  it.todo("GET /admin/roles including each role's permissions");
});

describe("roleService.updatePermissions", () => {
  it.todo("PATCH /admin/roles/:id/permissions, replacing the whole set");
});
