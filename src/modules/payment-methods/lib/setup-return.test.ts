// Pruebas unitarias de src/modules/payment-methods/lib/setup-return.ts
//
// COBERTURA PARCIAL POR ENTORNO: `tsx --test` corre en Node puro, sin DOM, así
// que `typeof window === "undefined"` es verdadero durante toda la suite (el
// primer test lo verifica en vez de asumirlo). Lo que queda cubierto de verdad
// es la rama de servidor de `getSetupBaseline`/`rememberSetupBaseline`, el
// ciclo de vida de `subscribeSetupBaseline` y `isAwaitingCard` entera —la única
// función del archivo que es pura por diseño, porque recibe el `now`.
//
// SIN CUBRIR aquí, a propósito: la rama de navegador —leer y cachear el JSON de
// `sessionStorage`, el guard de `parse` contra un valor manipulado a mano,
// escribir el baseline y notificar a los suscriptores con `emit()`. Inventar un
// `globalThis.window`/`sessionStorage` sería una pieza falsa (prohibido por la
// política del loop) y además no probaría el navegador real. DESBLOQUEO, fuera
// de alcance: correr este archivo bajo un runner con DOM (jsdom/happy-dom) en
// un script de test aparte.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getServerSetupBaseline,
  getSetupBaseline,
  isAwaitingCard,
  rememberSetupBaseline,
  SETUP_CONFIRM_TIMEOUT_MS,
  subscribeSetupBaseline,
  type SetupBaseline,
} from "./setup-return";

const baselineAt = (count: number, at: number): SetupBaseline => ({
  count,
  at,
});

describe("test environment", () => {
  it("has no window, so only the server branch of this module is reachable", () => {
    assert.equal(typeof window, "undefined");
  });
});

describe("SETUP_CONFIRM_TIMEOUT_MS", () => {
  it("gives the webhook 45 seconds before the view stops waiting", () => {
    assert.equal(SETUP_CONFIRM_TIMEOUT_MS, 45_000);
  });
});

describe("getSetupBaseline", () => {
  it("returns null without a window: on the server nobody just came back from Stripe", () => {
    assert.equal(getSetupBaseline(), null);
  });

  it("returns the same cached value on repeated calls, as useSyncExternalStore requires", () => {
    const first = getSetupBaseline();
    const second = getSetupBaseline();

    assert.equal(Object.is(first, second), true);
  });

  it("stays null after rememberSetupBaseline, which wrote nothing without a window", () => {
    rememberSetupBaseline(4);

    assert.equal(getSetupBaseline(), null);
  });
});

describe("getServerSetupBaseline", () => {
  it("always returns null, the trace a server render can never have", () => {
    assert.equal(getServerSetupBaseline(), null);
  });

  it("returns exactly null and never undefined, so the snapshot stays comparable", () => {
    assert.equal(Object.is(getServerSetupBaseline(), null), true);
    assert.equal(Object.is(getServerSetupBaseline(), getServerSetupBaseline()), true);
  });
});

describe("rememberSetupBaseline", () => {
  it("is a no-op without a window instead of throwing on sessionStorage", () => {
    assert.doesNotThrow(() => {
      rememberSetupBaseline(0);
    });
  });

  it("does not notify subscribers on the server, where the emit is never reached", () => {
    let calls = 0;
    const unsubscribe = subscribeSetupBaseline(() => {
      calls += 1;
    });

    rememberSetupBaseline(7);
    unsubscribe();

    assert.equal(calls, 0);
  });

  it("leaves the cached baseline untouched, so a later read still sees null", () => {
    rememberSetupBaseline(12);

    assert.equal(getSetupBaseline(), null);
  });
});

describe("subscribeSetupBaseline", () => {
  it("returns an unsubscribe function", () => {
    const unsubscribe = subscribeSetupBaseline(() => {});

    assert.equal(typeof unsubscribe, "function");
    unsubscribe();
  });

  it("does not invoke the listener at subscription time", () => {
    let calls = 0;
    const unsubscribe = subscribeSetupBaseline(() => {
      calls += 1;
    });

    unsubscribe();

    assert.equal(calls, 0);
  });

  it("gives every subscription its own unsubscribe function", () => {
    const listener = () => {};
    const first = subscribeSetupBaseline(listener);
    const second = subscribeSetupBaseline(listener);

    assert.equal(Object.is(first, second), false);

    first();
    second();
  });

  it("tolerates unsubscribing twice, as a double cleanup in StrictMode would", () => {
    const unsubscribe = subscribeSetupBaseline(() => {});

    unsubscribe();

    assert.doesNotThrow(() => {
      unsubscribe();
    });
  });

  it("lets one listener unsubscribe while another stays subscribed", () => {
    const keep = subscribeSetupBaseline(() => {});
    const drop = subscribeSetupBaseline(() => {});

    assert.doesNotThrow(() => {
      drop();
    });

    keep();
  });
});

describe("isAwaitingCard", () => {
  it("returns false without a baseline: nobody left for Stripe", () => {
    assert.equal(isAwaitingCard(null, 0, 1_000), false);
  });

  it("returns true while the card count has not grown and the timeout has not expired", () => {
    assert.equal(isAwaitingCard(baselineAt(2, 1_000), 2, 2_000), true);
  });

  it("returns true for the very first card, when the baseline count was zero", () => {
    assert.equal(isAwaitingCard(baselineAt(0, 1_000), 0, 1_000), true);
  });

  it("returns false as soon as the list grows by one: the webhook already wrote the row", () => {
    assert.equal(isAwaitingCard(baselineAt(2, 1_000), 3, 2_000), false);
  });

  it("returns true when the count dropped below the baseline, e.g. a card deleted meanwhile", () => {
    assert.equal(isAwaitingCard(baselineAt(3, 1_000), 1, 2_000), true);
  });

  it("still waits at the exact instant the baseline was recorded", () => {
    assert.equal(isAwaitingCard(baselineAt(1, 5_000), 1, 5_000), true);
  });

  it("still waits one millisecond before the timeout", () => {
    const baseline = baselineAt(1, 1_000);

    assert.equal(
      isAwaitingCard(baseline, 1, 1_000 + SETUP_CONFIRM_TIMEOUT_MS - 1),
      true,
    );
  });

  it("stops waiting exactly at the timeout, which is exclusive", () => {
    const baseline = baselineAt(1, 1_000);

    assert.equal(
      isAwaitingCard(baseline, 1, 1_000 + SETUP_CONFIRM_TIMEOUT_MS),
      false,
    );
  });

  it("stops waiting past the timeout", () => {
    const baseline = baselineAt(1, 1_000);

    assert.equal(
      isAwaitingCard(baseline, 1, 1_000 + SETUP_CONFIRM_TIMEOUT_MS + 1),
      false,
    );
  });

  it("keeps waiting when the clock reads earlier than the baseline, so skew never cuts the wait short", () => {
    assert.equal(isAwaitingCard(baselineAt(1, 10_000), 1, 0), true);
  });

  it("returns false once the count grew, even inside the timeout window", () => {
    assert.equal(isAwaitingCard(baselineAt(1, 1_000), 5, 1_001), false);
  });

  it("returns false when both conditions fail: more cards and the timeout expired", () => {
    assert.equal(
      isAwaitingCard(baselineAt(1, 1_000), 2, 1_000 + SETUP_CONFIRM_TIMEOUT_MS),
      false,
    );
  });

  it("is pure: the same arguments give the same answer, with no clock read inside", () => {
    const baseline = baselineAt(2, 1_000);

    assert.equal(isAwaitingCard(baseline, 2, 2_000), true);
    assert.equal(isAwaitingCard(baseline, 2, 2_000), true);
    assert.equal(isAwaitingCard(baseline, 2, 2_000), isAwaitingCard(baseline, 2, 2_000));
  });

  it("does not mutate the baseline it receives", () => {
    const baseline = baselineAt(2, 1_000);

    isAwaitingCard(baseline, 3, 99_999);

    assert.deepEqual(baseline, { count: 2, at: 1_000 });
  });
});
