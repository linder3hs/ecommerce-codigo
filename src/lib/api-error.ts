import { ZodError } from "zod";

export type ApiErrorIssue = {
  path: string;
  message: string;
};

export type ApiErrorBody = {
  message: string;
  issues?: ApiErrorIssue[];
};

export class NotFoundError extends Error {
  constructor(message = "Recurso no encontrado.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class SlugConflictError extends Error {
  constructor(message = "Ya existe un registro con ese slug.") {
    super(message);
    this.name = "SlugConflictError";
  }
}

// Sin sesión: el usuario no está autenticado y la respuesta correcta es 401.
export class UnauthorizedError extends Error {
  constructor(message = "Necesitas iniciar sesión para continuar.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

// Con sesión pero sin el permiso requerido: 403, nunca 404 ni 401.
export class ForbiddenError extends Error {
  constructor(message = "No tienes permiso para realizar esta acción.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// La petición es válida pero choca con el estado actual del recurso: stock
// insuficiente, producto despublicado o espejo de usuario todavía sin
// sincronizar. Es 409 y no 400: reintentar el mismo body puede funcionar.
export class ConflictError extends Error {
  constructor(message = "La operación no se puede completar ahora mismo.") {
    super(message);
    this.name = "ConflictError";
  }
}

export function jsonError(
  status: number,
  message: string,
  issues?: ApiErrorIssue[],
): Response {
  const body: ApiErrorBody = issues?.length ? { message, issues } : { message };

  return Response.json(body, { status });
}

function toIssues(error: ZodError): ApiErrorIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

// Postgres viola el índice único con 23505 cuando dos altas simultáneas pasan
// la comprobación previa de slug: sin esto la carrera devolvería 500.
const PG_UNIQUE_VIOLATION = "23505";

export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = (error as { code?: unknown }).code;

  if (code === PG_UNIQUE_VIOLATION) {
    return true;
  }

  const cause = (error as { cause?: unknown }).cause;

  return cause !== undefined && cause !== error && isUniqueViolation(cause);
}

export function handleApiError(error: unknown): Response {
  if (error instanceof ZodError) {
    return jsonError(
      400,
      "Los datos enviados no son válidos.",
      toIssues(error),
    );
  }

  if (error instanceof UnauthorizedError) {
    return jsonError(401, error.message);
  }

  if (error instanceof ForbiddenError) {
    return jsonError(403, error.message);
  }

  if (error instanceof NotFoundError) {
    return jsonError(404, error.message);
  }

  if (error instanceof SlugConflictError || error instanceof ConflictError) {
    return jsonError(409, error.message);
  }

  console.error(error);

  return jsonError(500, "Ocurrió un error inesperado. Intenta de nuevo.");
}
