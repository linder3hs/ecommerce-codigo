// Pruebas unitarias de src/lib/query-client.ts.
//
// Cobertura parcial por entorno, a propósito. `getQueryClient` se bifurca con
// el `isServer` de TanStack Query, que en este runner (`tsx --test`, Node puro
// sin DOM) es siempre `true`: la única rama alcanzable es la de servidor
// —instancia nueva en cada llamada— y es la que se testea, tras comprobar en
// un test que efectivamente no hay `window`.
//
// La rama de navegador (el singleton `browserQueryClient ??= …`) queda SIN
// CUBRIR en este entorno. No se simula con un `window` falso: eso sería
// fabricar una pieza inexistente. Desbloqueo real, si se quiere esa cobertura:
// un segundo script de tests con runner DOM (jsdom/happy-dom) sobre un glob
// aparte. Es decisión de configuración, fuera del alcance de este loop.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { QueryClient, isServer } from "@tanstack/react-query";

import { getQueryClient } from "./query-client";

describe("test environment", () => {
  it("runs without a DOM, so there is no window global", () => {
    assert.equal(typeof window, "undefined");
  });

  it("makes TanStack Query report the server branch as active", () => {
    assert.equal(isServer, true);
  });
});

describe("getQueryClient", () => {
  it("returns a QueryClient", () => {
    assert.ok(getQueryClient() instanceof QueryClient);
  });

  it("returns a fresh instance on every call while on the server", () => {
    assert.notEqual(getQueryClient(), getQueryClient());
  });

  it("returns three distinct instances across three consecutive calls", () => {
    const first = getQueryClient();
    const second = getQueryClient();
    const third = getQueryClient();

    assert.equal(new Set([first, second, third]).size, 3);
  });

  it("gives each server instance its own cache, so no request leaks into another", () => {
    const first = getQueryClient();
    const second = getQueryClient();

    first.setQueryData(["products"], ["laptop"]);

    assert.deepEqual(first.getQueryData(["products"]), ["laptop"]);
    assert.equal(second.getQueryData(["products"]), undefined);
  });

  it("sets a one minute stale time on queries", () => {
    assert.equal(getQueryClient().getDefaultOptions().queries?.staleTime, 60 * 1000);
  });

  it("disables refetch on window focus", () => {
    assert.equal(
      getQueryClient().getDefaultOptions().queries?.refetchOnWindowFocus,
      false,
    );
  });

  it("retries a failed query once", () => {
    assert.equal(getQueryClient().getDefaultOptions().queries?.retry, 1);
  });

  it("applies the same defaults to every instance it hands out", () => {
    assert.deepEqual(
      getQueryClient().getDefaultOptions(),
      getQueryClient().getDefaultOptions(),
    );
  });

  it("does not set mutation defaults", () => {
    assert.equal(getQueryClient().getDefaultOptions().mutations, undefined);
  });
});
