# SETUP — E-commerce Tech

Referencia de **arquitectura** para spec, developer y reviewer. Es lo único que
hace falta leer para ubicar un archivo o decidir una capa.

Anexos (no se leen por defecto):

- [BOOTSTRAP.md](BOOTSTRAP.md) — stack, instalación, `.env`, scripts, checklist de arranque.
- [DATA-MODEL.md](DATA-MODEL.md) — columnas y reglas de RBAC y `audit_logs`. Solo si tu tarea toca esas tablas.

---

## 1. Estructura de carpetas

Modular por dominio sobre App Router: `app/` enruta y compone, la lógica vive en
`modules/` (cliente) y `server/` (datos).

```
src/
├── app/
│   ├── (storefront)/     módulo CLIENTE — home, products/[slug], cart, checkout, orders
│   ├── (admin)/admin/    módulo ADMIN — dashboard, products, categories, orders,
│   │                     customers, roles, audit-logs. layout.tsx con guard.
│   ├── (auth)/           sign-in/[[...sign-in]], sign-up/[[...sign-up]]
│   ├── api/              Route Handlers — única API pública. api/admin/* para admin.
│   ├── layout.tsx        root: fonts, ClerkProvider, Providers
│   └── globals.css
│
├── modules/<dominio>/    products | categories | cart | orders | customers |
│   ├── components/       dashboard | roles | audit
│   ├── hooks/            TanStack Query: useProducts, useCreateProduct
│   ├── services/         axios tipado: product.service.ts
│   ├── schemas/          Zod de entrada/salida
│   ├── store/            Zustand, solo si el dominio tiene estado UI global
│   └── types/            tipos derivados del schema Drizzle
│
├── server/               SOLO servidor — nunca importar desde cliente
│   ├── db/index.ts       cliente Drizzle + Neon
│   ├── db/schema/        una tabla por archivo + index.ts barrel
│   ├── db/seed.ts
│   ├── repositories/     acceso a datos: product.repository.ts
│   └── services/         reglas de negocio que cruzan repositorios
│
├── components/
│   ├── ui/               shadcn — no editar a mano salvo tokens
│   ├── shared/           header, footer, sidebar, data-table, empty-state
│   └── providers/        query-provider, theme-provider
│
├── lib/
│   ├── axios.ts          instancia única con baseURL e interceptores
│   ├── query-client.ts   config de TanStack Query
│   ├── utils.ts          cn() y helpers puros
│   ├── auth.ts           requireAuth, requireAdmin
│   ├── permissions.ts    PERMISSIONS (códigos), can(), requirePermission()
│   └── audit.ts          logAudit() — escribe en audit_logs dentro de la tx
│
├── hooks/                transversales (useDebounce, useMediaQuery)
├── types/                tipos globales
└── proxy.ts              Clerk: rutas públicas vs protegidas vs admin
                          (Next 16 renombró `middleware.ts` → `proxy.ts`)
```

Fuera de `src/`: `docs/specs/` (specs SDD), `drizzle/` (migraciones),
`.claude/agents/`.

## 2. Convenciones de nombres

| Elemento              | Convención                | Ejemplo                           |
| --------------------- | ------------------------- | --------------------------------- |
| Archivo de componente | kebab-case                | `product-card.tsx`                |
| Componente            | PascalCase                | `ProductCard`                     |
| Hook                  | `use` + camelCase         | `useProducts`                     |
| Service               | `<dominio>.service.ts`    | `product.service.ts`              |
| Repositorio           | `<dominio>.repository.ts` | `product.repository.ts`           |
| Schema Drizzle        | singular                  | `src/server/db/schema/product.ts` |
| Tabla en Postgres     | snake_case plural         | `products`, `order_items`         |
| Route Handler         | `route.ts`                | `app/api/products/route.ts`       |

## 3. Flujo de datos

```
Server Component ──────────────────────► repositorio ──► Drizzle ──► Neon
   (lectura inicial, SEO)

Client Component ──► hook (TanStack Query) ──► service (axios)
                                                     ▼
                                          Route Handler (/api)
                                             · Clerk auth
                                             · validación Zod
                                             · repositorio ──► Drizzle ──► Neon
```

### Reglas duras

1. Un componente **nunca** importa `db`, Drizzle ni un repositorio.
2. Un componente **nunca** llama `axios`/`fetch` directo. Va en `services/`, se consume vía hook.
3. Toda consulta a BD vive en `src/server/repositories/`. Los Route Handlers orquestan, no consultan.
4. Todo Route Handler valida su entrada con Zod antes de llamar al repositorio.
5. Los tipos se **infieren** del schema Drizzle (`InferSelectModel`), no se escriben dos veces.
6. Datos de servidor → TanStack Query. Estado de UI → Zustand. Sin mezclar.
7. `"use client"` lo más abajo posible. Nunca en un layout que no lo necesita.
8. Admin protegido en dos capas: `proxy.ts` en el borde + `requirePermission('<recurso>.<acción>')`
   en cada handler de `/api/admin/`. Nunca por nombre de rol (`role === 'admin'` es bloqueante).
9. `audit_logs` es append-only y se escribe con `logAudit()` en la misma transacción
   que la mutación. Sin PII ni secretos en `changes`/`metadata`.

## 4. Tablas

Precios en **enteros (centavos)**. Nunca `float`. El detalle de cada tabla lo
define su spec; columnas de RBAC y auditoría en [DATA-MODEL.md](DATA-MODEL.md).

| Grupo            | Tablas                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------- |
| Identidad y RBAC | `users` (espejo de Clerk) · `roles` · `permissions` · `role_permissions` · `user_roles` |
| Auditoría        | `audit_logs`                                                                            |
| Catálogo         | `categories` · `products` · `product_images`                                            |
| Ventas           | `carts` · `cart_items` · `orders` · `order_items`                                       |

Clerk es la fuente de verdad de la **autenticación**; Postgres, de la
**autorización**. `users` se sincroniza por webhook.
