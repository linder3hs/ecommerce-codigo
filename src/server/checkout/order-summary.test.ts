// Pruebas unitarias de src/server/checkout/order-summary.ts — bloqueadas, y es
// el caso más frustrante de todo el loop.
//
// BLOQUEO: uno solo, y no es de diseño de la función. `toOrderSummary` es una
// proyección 100% pura: recibe un `OrderWithItemsRow` ya materializado, no toca
// base de datos, red, reloj ni entorno, y devuelve un objeto nuevo. Lo único
// que impide testearla es el `import "server-only"` de la primera línea de su
// propio archivo, que lanza en el import bajo `tsx --test` ("This module cannot
// be imported from a Client Component module"); verificado con un import real.
// No hay nada que simular: el bloqueo es el marcador del archivo, no la
// función. Este es el punto 1 de la escalación en docs/testing/loop-progress.md.
// DESBLOQUEO (fuera de alcance de este loop, decisión del humano): mover
// `toOrderSummary` a un módulo sin `server-only` —es una proyección de
// presentación, no acceso a datos— y volverla a importar desde las dos rutas.
// Eso la vuelve testeable de inmediato y sin tocar la arquitectura. Merece la
// pena porque es la función que garantiza que el cliente NO reciba `userId` ni
// los identificadores de Stripe: hoy ese recorte no tiene ninguna red de
// seguridad automatizada, y es exactamente la clase de invariante que un test
// debería fijar.
import { describe, it } from "node:test";

describe("toOrderSummary", () => {
  it.todo("projects an order with items into the client-facing OrderSummary shape, without userId or Stripe ids");
});
