---
id: 009
title: Vista de perfil del cliente
status: done
module: storefront
scope: client
---

# 009 — Vista de perfil del cliente

## Objetivo
Un cliente autenticado entra a `/profile` desde el dropdown de su avatar y ve tres
secciones —Mi perfil, Mis favoritos, Mis compras— con sus datos de Clerk en la primera.

## Alcance
Incluye:
- Vista `/profile` con estilo storefront (tokens de `lib/styles.ts`), no shadcn.
- Sección activa por query param `?tab=profile|favorites|orders`; por defecto `profile`.
- Mi perfil: avatar, nombre, email, miembro desde, rol (solo lectura).
- Favoritos y Compras: estado vacío con CTA al catálogo. Sin datos ni endpoints.
- Entrada "Mi perfil" en el menú del `UserButton` (desktop y barra mobile).
- Mover la página Clerk `<UserProfile />` actual a `/profile/account`.

No incluye:
- Tablas `favorites`, lectura de `orders`, ni endpoints nuevos.
- Habilitar el botón de corazón del nav (sigue deshabilitado hasta el spec de favoritos).
- Edición de datos en `/profile`: eso lo sigue haciendo el widget de Clerk en `/profile/account`.

## Criterios de aceptación
- [x] AC1 — Dado un usuario con sesión, cuando abre el menú de su avatar, entonces ve el ítem "Mi perfil" que navega a `/profile`.
- [x] AC2 — Dado un visitante sin sesión, cuando entra a `/profile`, entonces `proxy.ts` lo manda a `/sign-in` y vuelve a `/profile` tras autenticarse.
- [x] AC3 — Dado `/profile` (sin `tab` o con `tab` inválido), entonces la sección activa es "Mi perfil" y muestra avatar, nombre, email, fecha de alta y badge de rol.
- [x] AC4 — Dado `/profile?tab=favorites`, entonces se ve el vacío "Todavía no guardaste favoritos" con botón "Ver catálogo" → `/products`.
- [x] AC5 — Dado `/profile?tab=orders`, entonces se ve el vacío "Todavía no tenés compras" con el mismo CTA.
- [x] AC6 — Dado el ítem "Gestionar cuenta" de Clerk, entonces navega a `/profile/account` y el `<UserProfile />` sigue operativo.
- [x] AC7 — Dado el usuario sin fila local en `users` (webhook pendiente), entonces la sección Mi perfil se muestra igual con el rol "Cliente".

## Datos
Sin cambios de esquema.

## API
Sin endpoints nuevos. Los datos salen de `currentUser()` (Clerk, servidor) y del
repositorio de roles, leídos en la página como Server Component —el patrón de
`docs/SETUP.md` §3 para lectura inicial sin interacción.

Zod: `profileTabSchema` — `z.enum(["profile", "favorites", "orders"]).catch("profile")`,
en `src/modules/storefront/lib/profile.ts`.

## Reutilizar
- `src/modules/storefront/lib/styles.ts` — `CARD`, `CHIP`, `CHIP_ON`, `PILL`, `PILL_BRAND`, `PILL_QUIET`, `MONO`, `FOCUS_RING`. No inventar clases nuevas.
- `src/modules/storefront/components/storefront-nav.tsx` — nav; el `UserButton` ya está montado dos veces (desktop y `MobileBar`).
- `src/modules/cart/components/cart-drawer.tsx` — se monta en la página como en `(storefront)/products/page.tsx`.
- `src/app/(storefront)/products/page.tsx` — shell de página a copiar: `flex flex-1 flex-col gap-3.5 px-4 pt-5 pb-27 lg:gap-5 lg:p-8` + `<StorefrontNav />`.
- `src/app/(storefront)/profile/page.tsx` — su contenido actual (auth, rol, `<UserProfile routing="hash" />`) se mueve tal cual a `account/page.tsx`.
- `src/lib/auth.ts` → `getCurrentAppUser()`; `src/server/repositories/role.repository.ts` → `findByUserId()`.
- `src/components/ui/badge.tsx`, `src/components/ui/avatar.tsx` — ya instalados.

Sin componentes shadcn nuevos. No usar `components/ui/tabs.tsx`: sus tokens son los
del panel admin y rompen la escala visual del storefront.

## Tareas
- [x] T1 — Mover la página Clerk actual (contenido intacto, `metadata.title` "Gestionar cuenta") · `src/app/(storefront)/profile/account/page.tsx`
- [x] T2 — Definir `profileTabSchema`, el tipo `ProfileTab` y la lista de secciones (id, label, icono) · `src/modules/storefront/lib/profile.ts`
- [x] T3 — Navegación de secciones con `<Link href="/profile?tab=…">` y `CHIP`/`CHIP_ON` en la activa; Server Component, sin `"use client"` · `src/modules/storefront/components/profile-tabs.tsx`
- [x] T4 — Tarjeta de datos: props `{ imageUrl, fullName, email, memberSince, roleName }`, sin importar Clerk ni repositorios · `src/modules/storefront/components/profile-account-card.tsx`
- [x] T5 — Estado vacío reutilizable: props `{ icon, title, description }` + CTA fijo a `/products` · `src/modules/storefront/components/profile-empty.tsx`
- [x] T6 — Página `/profile`: lee `searchParams` y `currentUser()`, resuelve el rol y compone nav + tabs + sección + `<CartDrawer />` · `src/app/(storefront)/profile/page.tsx`
- [x] T7 — Añadir `<UserButton.MenuItems><UserButton.Link label="Mi perfil" labelIcon={…} href="/profile" />` en las dos instancias y cambiar `userProfileUrl` a `/profile/account` · `src/modules/storefront/components/storefront-nav.tsx`

Verificación final: `npm run typecheck && npm run lint`

## Notas
- `UserButton.MenuItems` / `UserButton.Link` existen en `@clerk/nextjs@7.8` (verificado en
  `node_modules/@clerk/react/dist/index.d.mts`); `labelIcon` exige un elemento, no un componente.
- Hoy `userProfileUrl="/profile"`: si no se cambia en T7, "Gestionar cuenta" cae en la vista
  nueva y el usuario pierde el acceso a la gestión de Clerk.
- `currentUser()` devuelve `createdAt` en ms; formatear con `Intl.DateTimeFormat("es-PE", { timeZone: "UTC" })`
  para que servidor y cliente no difieran.
- En Next 16 `searchParams` es una promesa: `const { tab } = await searchParams`.
