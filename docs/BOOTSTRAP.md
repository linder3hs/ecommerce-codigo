# BOOTSTRAP — E-commerce Tech

Instalación inicial del proyecto. **Se lee una vez, al arrancar.** Los agentes no
lo necesitan durante el desarrollo: su referencia es [SETUP.md](SETUP.md).

---

## 1. Stack

| Capa | Tecnología | Versión objetivo |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.x |
| Runtime UI | React | 19.x |
| Lenguaje | TypeScript (strict) | 5.x |
| Estilos | Tailwind CSS | 4.x |
| Componentes | shadcn/ui (Radix + CVA) | latest |
| Base de datos | Neon Postgres (serverless) | — |
| ORM | Drizzle ORM + drizzle-kit | latest |
| Auth | Clerk (`@clerk/nextjs`) | latest |
| Estado servidor | TanStack Query v5 | 5.x |
| Tablas | TanStack Table v8 | 8.x |
| HTTP | Axios | 1.x |
| Estado cliente | Zustand | 5.x |
| Gráficos | Recharts | 2.x |
| Validación | Zod | 4.x |
| Formularios | React Hook Form + @hookform/resolvers | latest |
| Gestor de paquetes | **npm** | — |

---

## 2. Bootstrap del proyecto

```bash
# 1. Scaffold
npx create-next-app@latest . \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --turbopack --use-npm

# 2. Datos — Neon + Drizzle
npm i drizzle-orm @neondatabase/serverless
npm i -D drizzle-kit dotenv tsx

# 3. Auth
npm i @clerk/nextjs

# 4. Estado de servidor y tablas
npm i @tanstack/react-query @tanstack/react-table
npm i -D @tanstack/react-query-devtools

# 5. HTTP, estado cliente, gráficos
npm i axios zustand recharts

# 6. Validación y formularios
npm i zod react-hook-form @hookform/resolvers

# 7. UI
npx shadcn@latest init
npx shadcn@latest add button input label card table dialog sheet \
  dropdown-menu select badge separator skeleton sonner form tabs avatar

# 8. Utilidades
npm i class-variance-authority clsx tailwind-merge lucide-react next-themes
npm i -D prettier prettier-plugin-tailwindcss
```

### Variables de entorno (`.env.local`)

```bash
# Neon
DATABASE_URL="postgresql://<user>:<pass>@<host>.neon.tech/<db>?sslmode=require"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

`.env.local` va en `.gitignore`. Nunca se commitea. Mantén un `.env.example` con
las claves vacías.

### Scripts (`package.json`)

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/server/db/seed.ts"
  }
}
```

---

---

## 3. Checklist de arranque

- [ ] `create-next-app` ejecutado con las flags de la sección 2
- [ ] Dependencias instaladas
- [ ] Proyecto Neon creado y `DATABASE_URL` en `.env.local`
- [ ] `drizzle.config.ts` apuntando a `src/server/db/schema`
- [ ] Aplicación Clerk creada y claves en `.env.local`
- [ ] `middleware.ts` con rutas públicas, protegidas y de admin
- [ ] Webhook de Clerk (`user.created/updated/deleted`) sincronizando `users`
- [ ] Seed de `permissions` y roles de sistema ejecutado (`npm run db:seed`)
- [ ] `ClerkProvider` + `QueryProvider` en `src/app/layout.tsx`
- [ ] `shadcn init` ejecutado y componentes base agregados
- [ ] Estructura de carpetas de la sección 3 creada
- [ ] `npm run typecheck`, `npm run lint` y `npm run build` en verde

---

## 4. Módulos funcionales (alcance del curso)

### Cliente (storefront)
Catálogo con filtros y búsqueda · ficha de producto · carrito · checkout ·
historial y detalle de pedidos · perfil (Clerk).

### Administración
Dashboard con métricas (Recharts: ventas, pedidos, top productos, stock bajo) ·
CRUD de productos y categorías (TanStack Table: paginación, orden, filtros) ·
gestión de pedidos y cambio de estado · listado de clientes.

Gestión de accesos: CRUD de roles, matriz rol × permiso, asignación de roles a
usuarios · bitácora de auditoría filtrable por actor, entidad, acción y fecha.

Acceso admin protegido en dos capas: `middleware.ts` (borde) y verificación por
**código de permiso** en cada Route Handler bajo `/api/admin/`
(`requirePermission('products.create')`), nunca por nombre de rol.

---

