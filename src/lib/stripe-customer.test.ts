// Pruebas unitarias de src/lib/stripe-customer.ts — bloqueadas.
//
// BLOQUEO: el archivo abre con `import "server-only"`, que lanza en el propio
// import bajo `tsx --test`; verificado con un import real. La función es I/O de
// principio a fin: lee el usuario local, llama a `customers.create` de Stripe y
// resuelve la carrera de altas concurrentes releyendo la fila. No hay nada que
// observar sin red ni base de datos, y la política del loop prohíbe montar
// dobles de ambas.
// DESBLOQUEO (fuera de alcance): test de integración contra Stripe en modo
// test y una base de datos de prueba.
import { describe, it } from "node:test";

describe("getOrCreateStripeCustomer", () => {
  it.todo("returns the user's stripeCustomerId, creating it in Stripe the first time and resolving concurrent creation races");
});
