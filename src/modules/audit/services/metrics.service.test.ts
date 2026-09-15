// Pruebas unitarias de src/modules/audit/services/metrics.service.ts — bloqueadas.
//
// BLOQUEO: el módulo importa la instancia `api` de `@/lib/axios`, un singleton
// creado en tiempo de import y sin punto de inyección de transporte. Smoke-check
// con un import real bajo `tsx`: el módulo carga sin romper, así que lo que
// falta es la costura, no el runner. El archivo entero es un método: un GET a
// una constante que devuelve `data`. Sin parámetros ni mapeo de status no queda
// nada propio que afirmar salvo "se llamó a axios", lo que exige una pieza falsa
// y está prohibido por la política del loop.
// DESBLOQUEO (fuera de alcance): recibir el cliente HTTP como parámetro/factory.
// El cálculo real de las métricas vive en los agregados SQL de
// `audit.repository.countBySeverity` y `user.repository.countByRole`, que piden
// pruebas de integración, no unitarias.
import { describe, it } from "node:test";

describe("metricsService.summary", () => {
  it.todo("GET /admin/metrics");
});
