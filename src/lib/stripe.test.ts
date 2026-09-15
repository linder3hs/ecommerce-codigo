// Pruebas unitarias de src/lib/stripe.ts — bloqueadas.
//
// BLOQUEO: el archivo abre con `import "server-only"`, que lanza en el propio
// import bajo `tsx --test`; verificado con un import real. `getStripe` además
// construye el cliente de Stripe con `STRIPE_SECRET_KEY`, así que su singleton
// perezoso tampoco se ejercita sin credenciales.
// NOTA PARA EL HUMANO: las otras cuatro exportaciones sí son puras o de puro
// entorno —`getStoreCurrency` (lee `STRIPE_CURRENCY` y valida ISO-4217),
// `getStripeWebhookSecret` (lee `STRIPE_WEBHOOK_SECRET` o lanza),
// `isResourceMissingError` y `asStripeCardError` (solo miran la forma del
// error)— y `process.env` no es una pieza falsa. Lo único que las bloquea es
// el `server-only` del propio archivo, igual que el caso de `toOrderSummary`.
// DESBLOQUEO (fuera de alcance): separarlas en un módulo sin ese marcador
// (p. ej. `stripe-env.ts` / `stripe-errors.ts`) y dejar aquí solo el cliente.
import { describe, it } from "node:test";

describe("getStripe", () => {
  it.todo("lazily initializes and returns the Stripe client built from STRIPE_SECRET_KEY");
});

describe("getStoreCurrency", () => {
  it.todo("reads STRIPE_CURRENCY from the environment and validates it is a 3-letter ISO-4217 code, falling back to pen");
});

describe("isResourceMissingError", () => {
  it.todo("detects whether a Stripe error is resource_missing");
});

describe("asStripeCardError", () => {
  it.todo("casts an error to StripeCardError when it is a card decline");
});

describe("getStripeWebhookSecret", () => {
  it.todo("reads STRIPE_WEBHOOK_SECRET from the environment or throws when missing");
});
