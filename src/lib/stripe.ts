import "server-only";

import Stripe from "stripe";

// Moneda única de la tienda. `formatCents` imprime "S/", así que el fallback es
// soles: si el entorno no la define, el importe cobrado coincide con el que se
// muestra en pantalla en vez de convertirse en dólares por descuido.
const DEFAULT_CURRENCY = "pen";

// Inicialización perezosa y singleton, igual que `getDb()`: `next build` evalúa
// el módulo y construir el cliente en el import lanzaría cuando la clave todavía
// no está en el entorno de build.
let instance: Stripe | null = null;

function createStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY no está definida.");
  }

  return new Stripe(key);
}

export function getStripe(): Stripe {
  if (!instance) {
    instance = createStripe();
  }

  return instance;
}

/**
 * Moneda ISO-4217 en minúsculas que espera `price_data.currency`. La orden
 * guarda el valor devuelto acá para no depender del entorno a futuro: cambiar
 * `STRIPE_CURRENCY` no puede reescribir el importe de una compra histórica.
 */
export function getStoreCurrency(): string {
  const currency = process.env.STRIPE_CURRENCY?.trim().toLowerCase();

  return currency && currency.length === 3 ? currency : DEFAULT_CURRENCY;
}

/**
 * El recurso ya no existe en Stripe. Es el caso de un `detach` sobre una
 * tarjeta que alguien desasoció desde el Dashboard: el efecto buscado ya está,
 * así que quien llama puede seguir en vez de abortar.
 */
export function isResourceMissingError(error: unknown): boolean {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === "resource_missing"
  );
}

/**
 * Rechazo de la tarjeta (`card_declined`, fondos insuficientes, vencida). No es
 * un fallo de la integración sino una respuesta del emisor, y su `message` está
 * escrito para mostrárselo a quien compra.
 */
export function asStripeCardError(error: unknown): Stripe.errors.StripeCardError | null {
  return error instanceof Stripe.errors.StripeCardError ? error : null;
}

/** Firma del webhook. Se lee aparte: el endpoint público no crea sesiones. */
export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET no está definida.");
  }

  return secret;
}
