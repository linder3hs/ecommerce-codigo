/**
 * Rastro del alta de tarjeta a través de la ida a Stripe. Guardar una tarjeta
 * saca a la persona de la aplicación y la trae de vuelta con `?setup=success`,
 * pero la fila la escribe el webhook: al volver, la lista puede no incluirla
 * todavía. Sin saber cuántas tarjetas había ANTES de irse no hay forma de
 * distinguir "el webhook aún no llegó" de "ya está guardada".
 *
 * Va en `sessionStorage` y no en Zustand porque es estado de una sola pestaña
 * que tiene que sobrevivir a una navegación completa fuera del sitio, y se
 * expone como store externo para que React lo lea con `useSyncExternalStore`:
 * en el render del servidor no existe y ese hook es el que sabe reconciliarlo
 * sin desajustar la hidratación.
 */

const KEY = "payment-methods:setup-baseline";

// Pasado este tiempo se deja de esperar al webhook: si no llegó, insistir en
// pantalla solo transmite que algo está roto sin ofrecer una salida.
export const SETUP_CONFIRM_TIMEOUT_MS = 45_000;

export type SetupBaseline = {
  count: number;
  at: number;
};

type Listener = () => void;

const listeners = new Set<Listener>();

// `getSnapshot` tiene que devolver la MISMA referencia mientras el valor no
// cambie: parsear el JSON en cada llamada devolvería un objeto nuevo y React
// entraría en un bucle de renders.
let cached: SetupBaseline | null | undefined;

function parse(raw: string | null): SetupBaseline | null {
  if (!raw) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(raw);

    if (
      typeof value === "object" &&
      value !== null &&
      typeof (value as SetupBaseline).count === "number" &&
      typeof (value as SetupBaseline).at === "number"
    ) {
      return value as SetupBaseline;
    }
  } catch {
    // Valor manipulado a mano: se descarta y la vista no espera a nadie.
  }

  return null;
}

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeSetupBaseline(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getSetupBaseline(): SetupBaseline | null {
  if (cached === undefined) {
    cached =
      typeof window === "undefined"
        ? null
        : parse(window.sessionStorage.getItem(KEY));
  }

  return cached;
}

/** En el servidor no hay rastro: nadie acaba de volver de Stripe. */
export function getServerSetupBaseline(): null {
  return null;
}

export function rememberSetupBaseline(count: number): void {
  if (typeof window === "undefined") {
    return;
  }

  const baseline: SetupBaseline = { count, at: Date.now() };

  window.sessionStorage.setItem(KEY, JSON.stringify(baseline));
  cached = baseline;
  emit();
}

/**
 * ¿Sigue teniendo sentido esperar a que el webhook escriba la tarjeta? Se
 * evalúa con un instante recibido y no con `Date.now()` adentro para que sea
 * pura: el render la llama con la marca de la última respuesta y el sondeo con
 * el reloj real.
 */
export function isAwaitingCard(
  baseline: SetupBaseline | null,
  count: number,
  now: number,
): boolean {
  return (
    baseline !== null &&
    count <= baseline.count &&
    now - baseline.at < SETUP_CONFIRM_TIMEOUT_MS
  );
}
