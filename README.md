# E-commerce Tech

E-commerce de tecnología en Next.js 16, con módulos de **cliente** (storefront)
y **administración**. Stack: Next.js 16 · React 19 · TypeScript strict ·
Tailwind 4 · shadcn/ui · Neon Postgres · Drizzle ORM · Clerk · TanStack Query
v5 · TanStack Table v8 · Axios · Zustand · Recharts · Zod · React Hook Form ·
Stripe.

## Cómo se construye este proyecto: SDD (Spec-Driven Development)

Todo el desarrollo de este repositorio pasa por **Spec-Driven Development**:
antes de escribir código para una feature, se escribe un spec corto y
ejecutable en `docs/specs/`, y ese spec necesita **aprobación humana explícita**
antes de que se implemente una sola línea.

```
Prompt del usuario
        │
        ▼
  ┌──────────────┐
  │ orchestrator │  clasifica: ¿SDD o BUILD?
  └──────┬───────┘
         │
   ┌─────┴──────────────────────────────┐
   │                                    │
 MODO: SDD                          MODO: BUILD
   │                                    │
   ▼                                    ▼
 spec ──► ⏸ APROBACIÓN HUMANA ──► developer ⇄ reviewer ──► done
                                                 (bucle, máx. 2)
```

- **orchestrator** clasifica cada petición: ¿requiere spec (SDD) o es una
  tarea acotada que va directo a build (fix, config, tarea mecánica)?
- **spec** convierte el requerimiento en un documento con criterios de
  aceptación, modelo de datos, contratos de API y tareas atómicas. Se
  detiene y espera que un humano responda `aprobado`.
- **developer** solo implementa sobre un spec en `status: approved`,
  reutilizando lo que ya existe en el repo y marcando cada tarea completada
  en el propio spec.
- **reviewer** audita la implementación contra el spec y la arquitectura, y
  devuelve hallazgos al developer. Máximo 2 vueltas del bucle developer ⇄
  reviewer; si no converge, se escala a un humano.

`docs/specs/` es la documentación viva del proyecto: cada feature construida
deja ahí su contexto, decisiones técnicas y contratos de API.

La arquitectura de carpetas y el flujo de datos completo están en
[`docs/SETUP.md`](docs/SETUP.md).

## Reglas de uso de IA como fuente de código

Este proyecto usa un agente de IA (Claude Code) como herramienta principal de
implementación, bajo reglas duras definidas en `CLAUDE.md` (el contrato de
trabajo que se lee en cada sesión):

1. **Ningún código se escribe sin pasar por la clasificación del
   orchestrator** ni sobre un spec en `draft`. La puerta de aprobación humana
   es obligatoria antes de implementar.
2. **La arquitectura no se improvisa.** Todo flujo de datos sigue:
   `Componente → hook (TanStack Query) → service (axios) → Route Handler →
   repositorio → Drizzle → Neon Postgres`. Un componente nunca importa `db`,
   Drizzle ni un repositorio directamente, ni llama `axios`/`fetch` fuera de
   `services/`.
3. **Separación de estado estricta:** datos de servidor → TanStack Query;
   estado de UI → Zustand. Sin mezclar.
4. **Seguridad no es opcional:** toda entrada a un Route Handler se valida
   con Zod; rutas y endpoints de admin se protegen en `middleware.ts` **y**
   con verificación de permiso en el handler (nunca comparando
   `role === 'admin'` en el código).
5. **Auditoría append-only:** cada mutación relevante escribe en
   `audit_logs` dentro de la misma transacción, sin PII sensible ni secretos.
6. **TypeScript estricto:** cero `any`, cero `@ts-ignore`. Tipos inferidos
   del schema de Drizzle, nunca duplicados a mano.
7. **SOLID y DRY con criterio:** una responsabilidad por archivo; se extrae
   a la tercera repetición, no antes.
8. **Precios en enteros (centavos), nunca `float`.** Errores propagados,
   nunca tragados con `catch {}` vacío.
9. **Verificación antes de cerrar cualquier tarea:**
   ```bash
   npm run typecheck && npm run lint && npm run build
   ```

El detalle completo de agentes, skills y reglas de arquitectura vive en
[`CLAUDE.md`](CLAUDE.md).

## Getting Started

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Comandos

```bash
npm run dev          # servidor de desarrollo (Turbopack)
npm run build        # build de producción
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run db:generate  # generar migración Drizzle
npm run db:migrate   # aplicar migraciones a Neon
npm run db:studio    # explorador de datos
npm run db:seed      # datos de prueba
```
