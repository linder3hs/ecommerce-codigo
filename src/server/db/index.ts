import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

function createDb() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL no está definida.");
  }

  // `neon-http` no soporta `db.transaction()` (es fetch por sentencia) y
  // `audit_logs` debe escribirse en la misma transacción que la mutación.
  // DATABASE_URL apunta al endpoint pooled de Neon (PgBouncer en modo
  // transacción), donde las sentencias preparadas no sobreviven: `prepare: false`.
  const client = postgres(url, { prepare: false });

  return drizzle(client, { schema });
}

// Inicialización perezosa: `next build` evalúa el módulo y la conexión
// lanzaría si DATABASE_URL aún no existe en el entorno de build.
let instance: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!instance) {
    instance = createDb();
  }

  return instance;
}

export type Db = PostgresJsDatabase<typeof schema>;

// Handle transaccional: lo que recibe el callback de `db.transaction()`. Los
// repositorios lo aceptan para componerse dentro de una transacción.
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
