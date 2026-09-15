// Pruebas unitarias de src/modules/audit/services/audit-log.service.ts — bloqueadas.
//
// BLOQUEO: el módulo importa la instancia `api` de `@/lib/axios`, un singleton
// creado en tiempo de import y sin punto de inyección de transporte. Smoke-check
// con un import real bajo `tsx`: el módulo carga sin romper, así que lo que
// falta es la costura, no el runner. El único método es un GET passthrough que
// pasa `params` y devuelve `data`. Lo que valdría la pena fijar aquí —que axios
// serialice los `Date` de `dateFrom`/`dateTo` como ISO 8601, que es justo lo que
// `auditLogQuerySchema` vuelve a coercionar en el servidor— es comportamiento
// del serializador de axios observable solo en la petición saliente: exigiría
// interceptar el transporte, es decir una pieza falsa, prohibida por la política
// del loop.
// DESBLOQUEO (fuera de alcance): recibir el cliente HTTP como parámetro/factory,
// o —más barato y más útil— serializar las fechas explícitamente en el service y
// testear esa función pura. El contrato de ida y vuelta también se cubriría
// probando `auditLogQuerySchema` contra cadenas ISO, que sí es puro.
import { describe, it } from "node:test";

describe("auditLogService.list", () => {
  it.todo("GET /admin/audit-logs (read only) with the given query parameters");
});
