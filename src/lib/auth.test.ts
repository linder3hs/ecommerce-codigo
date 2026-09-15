// Pruebas unitarias de src/lib/auth.ts — bloqueadas.
//
// BLOQUEO: el archivo abre con `import "server-only"`, que lanza en el propio
// import bajo `tsx --test`; verificado con un import real. Además ambas
// funciones son puro I/O de sesión: `requireAuth` llama a `auth()` de
// `@clerk/nextjs/server` (necesita el contexto de petición de Next) y
// `getCurrentAppUser` encadena esa sesión con `userRepository.findByClerkId`
// (necesita Neon). Sin sesión ni base de datos reales solo quedarían piezas
// falsas, prohibidas por la política del loop.
// DESBLOQUEO (fuera de alcance): tests de integración con contexto de petición
// de Next y base de datos de prueba; no es una costura que se abra desde aquí.
import { describe, it } from "node:test";

describe("requireAuth", () => {
  it.todo("returns the clerkId of the active session or throws UnauthorizedError");
});

describe("getCurrentAppUser", () => {
  it.todo("resolves the local users row from the Clerk session and returns null when there is no session or the webhook has not synced yet");
});
