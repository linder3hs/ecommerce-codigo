// Pruebas unitarias de src/lib/api-error.ts.
//
// Módulo puro: solo `zod` y el `Response` global de Node, sin `server-only`,
// sin red y sin base de datos. Todo se ejercita con valores reales.
//
// Nota sobre ruido en la salida: la rama 500 de `handleApiError` hace
// `console.error(error)` a propósito (es el log del error inesperado), así que
// los tests de esa rama imprimen el error en la consola del runner. No se
// silencia: sustituir `console.error` sería fabricar una pieza falsa.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z, ZodError } from "zod";

import {
  ConflictError,
  ForbiddenError,
  handleApiError,
  isUniqueViolation,
  jsonError,
  NotFoundError,
  SlugConflictError,
  UnauthorizedError,
  type ApiErrorBody,
} from "./api-error";

async function readBody(response: Response): Promise<ApiErrorBody> {
  return (await response.json()) as ApiErrorBody;
}

function zodErrorFrom(value: unknown): ZodError {
  const result = z
    .object({ name: z.string(), nested: z.object({ age: z.number() }) })
    .safeParse(value);

  assert.equal(result.success, false);
  assert.ok(result.error instanceof ZodError);

  return result.error;
}

describe("jsonError", () => {
  it("uses the given status on the Response", async () => {
    const response = jsonError(418, "Soy una tetera.");

    assert.equal(response.status, 418);
  });

  it("serializes the message as JSON", async () => {
    const response = jsonError(400, "Datos inválidos.");

    assert.deepEqual(await readBody(response), { message: "Datos inválidos." });
  });

  it("sets a JSON content type", () => {
    const response = jsonError(400, "Datos inválidos.");

    assert.match(
      response.headers.get("content-type") ?? "",
      /application\/json/,
    );
  });

  it("includes the issues array when it has entries", async () => {
    const response = jsonError(400, "Datos inválidos.", [
      { path: "name", message: "Requerido." },
      { path: "price.cents", message: "Debe ser entero." },
    ]);

    assert.deepEqual(await readBody(response), {
      message: "Datos inválidos.",
      issues: [
        { path: "name", message: "Requerido." },
        { path: "price.cents", message: "Debe ser entero." },
      ],
    });
  });

  it("omits the issues key when the array is empty", async () => {
    const body = await readBody(jsonError(400, "Datos inválidos.", []));

    assert.deepEqual(body, { message: "Datos inválidos." });
    assert.equal("issues" in body, false);
  });

  it("omits the issues key when issues is undefined", async () => {
    const body = await readBody(jsonError(500, "Error."));

    assert.equal("issues" in body, false);
  });

  it("keeps an empty message as an empty string instead of dropping it", async () => {
    assert.deepEqual(await readBody(jsonError(400, "")), { message: "" });
  });

  it("returns a body that can be read only once, like any Response", async () => {
    const response = jsonError(404, "No encontrado.");
    await response.json();

    assert.equal(response.bodyUsed, true);
  });
});

describe("isUniqueViolation", () => {
  it("returns true for an object whose code is the Postgres 23505 string", () => {
    assert.equal(isUniqueViolation({ code: "23505" }), true);
  });

  it("returns false for a different Postgres error code", () => {
    // 23503 es violación de foreign key, no de índice único.
    assert.equal(isUniqueViolation({ code: "23503" }), false);
  });

  it("returns false when the code is the number 23505 instead of the string", () => {
    assert.equal(isUniqueViolation({ code: 23505 }), false);
  });

  it("returns false for null", () => {
    assert.equal(isUniqueViolation(null), false);
  });

  it("returns false for undefined", () => {
    assert.equal(isUniqueViolation(undefined), false);
  });

  it("returns false for the string '23505' because it is not an object", () => {
    assert.equal(isUniqueViolation("23505"), false);
  });

  it("returns false for an Error without a code", () => {
    assert.equal(isUniqueViolation(new Error("boom")), false);
  });

  it("detects the code one level down in error.cause", () => {
    const error = new Error("insert failed", { cause: { code: "23505" } });

    assert.equal(isUniqueViolation(error), true);
  });

  it("detects the code three levels down the cause chain", () => {
    const deepest = new Error("pg", { cause: { code: "23505" } });
    const middle = new Error("driver", { cause: deepest });
    const top = new Error("drizzle", { cause: middle });

    assert.equal(isUniqueViolation(top), true);
  });

  it("returns false when no link of the cause chain carries the code", () => {
    const top = new Error("drizzle", {
      cause: new Error("driver", { cause: new Error("pg") }),
    });

    assert.equal(isUniqueViolation(top), false);
  });

  it("returns false when the chain ends in a non-object cause", () => {
    assert.equal(
      isUniqueViolation(new Error("drizzle", { cause: "23505" })),
      false,
    );
  });

  it("returns false without looping when an error is its own cause", () => {
    const error: Error & { cause?: unknown } = new Error("self");
    error.cause = error;

    assert.equal(isUniqueViolation(error), false);
  });

  it("stops at a cause chain that carries the code only at the very top", () => {
    const top = { code: "23505", cause: new Error("irrelevante") };

    assert.equal(isUniqueViolation(top), true);
  });

  it("returns false for an array, which is an object without a code", () => {
    assert.equal(isUniqueViolation([{ code: "23505" }]), false);
  });

  // Hallazgo documentado, fuente sin tocar: la guarda `cause !== error` solo
  // corta la autorreferencia inmediata. Con un ciclo de dos errores que se
  // apuntan mutuamente la recursión no termina y revienta la pila en vez de
  // devolver `false`. Hoy es inalcanzable: las cadenas `cause` de pg/drizzle
  // son lineales.
  it("overflows the stack on a mutual cause cycle instead of returning false", () => {
    const first: Error & { cause?: unknown } = new Error("first");
    const second: Error & { cause?: unknown } = new Error("second");
    first.cause = second;
    second.cause = first;

    assert.throws(() => isUniqueViolation(first), RangeError);
  });
});

describe("handleApiError", () => {
  it("maps a ZodError to 400", () => {
    assert.equal(
      handleApiError(zodErrorFrom({ nested: { age: "x" } })).status,
      400,
    );
  });

  it("replaces the Zod message with the project's generic 400 message", async () => {
    const body = await readBody(
      handleApiError(zodErrorFrom({ nested: { age: "x" } })),
    );

    assert.equal(body.message, "Los datos enviados no son válidos.");
  });

  it("maps every Zod issue into the issues array", async () => {
    const body = await readBody(
      handleApiError(zodErrorFrom({ nested: { age: "x" } })),
    );

    assert.equal(body.issues?.length, 2);
  });

  it("joins nested Zod paths with dots", async () => {
    const body = await readBody(
      handleApiError(zodErrorFrom({ nested: { age: "x" } })),
    );

    assert.deepEqual(
      body.issues?.map((issue) => issue.path),
      ["name", "nested.age"],
    );
  });

  it("keeps the original Zod message on each issue", async () => {
    const body = await readBody(
      handleApiError(zodErrorFrom({ nested: { age: "x" } })),
    );

    assert.match(body.issues?.[0].message ?? "", /expected string/);
  });

  it("uses an empty path string for an issue at the root of the payload", async () => {
    const result = z.object({ name: z.string() }).safeParse("no es un objeto");
    assert.ok(result.error);

    const body = await readBody(handleApiError(result.error));

    assert.deepEqual(
      body.issues?.map((issue) => issue.path),
      [""],
    );
  });

  it("maps UnauthorizedError to 401", () => {
    assert.equal(handleApiError(new UnauthorizedError()).status, 401);
  });

  it("returns the default UnauthorizedError message when none is given", async () => {
    const body = await readBody(handleApiError(new UnauthorizedError()));

    assert.equal(body.message, "Necesitas iniciar sesión para continuar.");
  });

  it("keeps a custom UnauthorizedError message", async () => {
    const body = await readBody(
      handleApiError(new UnauthorizedError("Sesión expirada.")),
    );

    assert.equal(body.message, "Sesión expirada.");
  });

  it("maps ForbiddenError to 403", () => {
    assert.equal(handleApiError(new ForbiddenError()).status, 403);
  });

  it("returns the default ForbiddenError message", async () => {
    const body = await readBody(handleApiError(new ForbiddenError()));

    assert.equal(body.message, "No tienes permiso para realizar esta acción.");
  });

  it("maps NotFoundError to 404", () => {
    assert.equal(handleApiError(new NotFoundError()).status, 404);
  });

  it("keeps a custom NotFoundError message", async () => {
    const body = await readBody(
      handleApiError(new NotFoundError("Producto no encontrado.")),
    );

    assert.equal(body.message, "Producto no encontrado.");
  });

  it("maps SlugConflictError to 409", () => {
    assert.equal(handleApiError(new SlugConflictError()).status, 409);
  });

  it("returns the default SlugConflictError message", async () => {
    const body = await readBody(handleApiError(new SlugConflictError()));

    assert.equal(body.message, "Ya existe un registro con ese slug.");
  });

  it("maps ConflictError to 409 as well", () => {
    assert.equal(handleApiError(new ConflictError()).status, 409);
  });

  it("keeps a custom ConflictError message", async () => {
    const body = await readBody(
      handleApiError(new ConflictError("Stock insuficiente.")),
    );

    assert.equal(body.message, "Stock insuficiente.");
  });

  it("never adds issues to a domain error response", async () => {
    const body = await readBody(handleApiError(new ConflictError()));

    assert.equal("issues" in body, false);
  });

  it("maps an unknown Error to 500", () => {
    assert.equal(handleApiError(new Error("connection reset")).status, 500);
  });

  it("does not leak the internal error message on a 500", async () => {
    const body = await readBody(
      handleApiError(new Error("password=hunter2 at postgres://host")),
    );

    assert.equal(
      body.message,
      "Ocurrió un error inesperado. Intenta de nuevo.",
    );
  });

  it("maps a thrown string to 500", () => {
    assert.equal(handleApiError("algo explotó").status, 500);
  });

  it("maps null to 500", () => {
    assert.equal(handleApiError(null).status, 500);
  });

  it("maps a unique violation object to 500 because it is not a domain error", () => {
    // `isUniqueViolation` es cosa del repositorio: quien traduce 23505 a
    // `SlugConflictError` es la capa de datos, no este mapeo.
    assert.equal(handleApiError({ code: "23505" }).status, 500);
  });

  it("does not treat a look-alike error with the same name as a domain error", () => {
    const impostor = new Error("No encontrado.");
    impostor.name = "NotFoundError";

    assert.equal(handleApiError(impostor).status, 500);
  });
});
