// Pruebas unitarias de src/lib/permissions.ts — bloqueadas.
//
// BLOQUEO: el archivo abre con `import "server-only"`, que lanza en el propio
// import bajo `tsx --test`; verificado con un import real. Encima arrastra dos
// dependencias de servidor más: `requireAuth` (sesión de Clerk) y
// `permissionRepository` (Neon). Es la pieza de autorización del proyecto, así
// que testearla con un repositorio de mentira daría una falsa sensación de
// cobertura sobre la decisión que más importa: no se hace.
// DESBLOQUEO (fuera de alcance): el filtrado contra el catálogo `PERMISSIONS`,
// `hasPermission` y la regla de escalada de `assertCanManageTargetUser` son
// decisiones puras sobre conjuntos ya cargados; moverlas a un módulo sin
// `server-only` que reciba el set efectivo como parámetro las haría testeables
// sin tocar la arquitectura de los handlers.
import { describe, it } from "node:test";

describe("getEffectivePermissions", () => {
  it.todo("fetches a user's permission codes and filters them against the PERMISSIONS catalog");
});

describe("hasPermission", () => {
  it.todo("checks whether a permission code is present in the effective set");
});

describe("requirePermission", () => {
  it.todo("authorization gate that demands a session (401) and the permission (403), returning the effective set");
});

describe("assertCanManageTargetUser", () => {
  it.todo("blocks privilege escalation by requiring users.assign_privileged_role to touch or promote an admin/super_admin user");
});
