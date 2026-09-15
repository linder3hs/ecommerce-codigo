// Pruebas unitarias de src/lib/audit.ts — bloqueadas.
//
// BLOQUEO: el archivo abre con `import "server-only"`, que lanza en el propio
// import bajo `tsx --test` ("This module cannot be imported from a Client
// Component module"); verificado con un import real. Aunque se saltara ese
// marcador, `logAudit` recibe una `Tx` de Drizzle y delega en
// `auditRepository.create`, así que ejercitarla exigiría una base de datos o
// un repositorio falso, prohibido por la política del loop.
// DESBLOQUEO (fuera de alcance): extraer el enmascarado de campos sensibles de
// `changes`/`metadata` —que sí es una transformación pura— a un módulo sin
// `server-only`, dejando en `logAudit` solo la inserción.
import { describe, it } from "node:test";

describe("logAudit", () => {
  it.todo("masks sensitive fields in changes/metadata and delegates the insert to auditRepository.create inside the received transaction");
});
