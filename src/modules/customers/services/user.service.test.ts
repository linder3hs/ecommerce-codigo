// Pruebas unitarias de src/modules/customers/services/user.service.ts — bloqueadas.
//
// BLOQUEO: el módulo importa la instancia `api` de `@/lib/axios`, un singleton
// creado en tiempo de import y sin punto de inyección de transporte. Smoke-check
// con un import real bajo `tsx`: el módulo carga sin romper, así que lo que
// falta es la costura, no el runner. Los cuatro métodos son passthrough —GET con
// `params`, POST del body, dos PATCH que concatenan el id y un sufijo de ruta— y
// no toman ninguna decisión propia. Lo importante de este módulo no vive aquí:
// la invitación a Clerk, el cambio de rol y el de estado se autorizan y auditan
// en el Route Handler con `requirePermission`. Verificar el passthrough exigiría
// una pieza falsa, prohibido por la política del loop.
// DESBLOQUEO (fuera de alcance): recibir el cliente HTTP como parámetro/factory
// en vez de importarlo. El valor real, aun así, estaría en probar los handlers
// de `/admin/customers` (permisos y `audit_logs`), no este archivo.
import { describe, it } from "node:test";

describe("userService.list", () => {
  it.todo("GET /admin/customers with the given query parameters");
});

describe("userService.invite", () => {
  it.todo("POST /admin/customers, creating a Clerk invitation");
});

describe("userService.updateRole", () => {
  it.todo("PATCH /admin/customers/:id/role");
});

describe("userService.updateStatus", () => {
  it.todo("PATCH /admin/customers/:id/status");
});
