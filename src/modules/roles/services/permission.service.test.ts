// Pruebas unitarias de src/modules/roles/services/permission.service.ts — bloqueadas.
//
// BLOQUEO: el módulo importa la instancia `api` de `@/lib/axios`, un singleton
// creado en tiempo de import y sin punto de inyección de transporte. Smoke-check
// con un import real bajo `tsx`: el módulo carga sin romper, así que lo que
// falta es la costura, no el runner. El archivo entero es un método: un GET a
// una constante que devuelve `data`. No hay ninguna decisión propia que afirmar
// —ni parámetros, ni ids, ni mapeo de status—, así que un test solo podría
// comprobar que se llamó a axios, lo que exige una pieza falsa y está prohibido
// por la política del loop.
// DESBLOQUEO (fuera de alcance): recibir el cliente HTTP como parámetro/factory.
// Aun así seguiría sin valer la pena: el catálogo de permisos que importa se
// resuelve en `permission.repository.ts` y se aplica en `lib/permissions.ts`.
import { describe, it } from "node:test";

describe("permissionService.list", () => {
  it.todo("GET /admin/permissions");
});
