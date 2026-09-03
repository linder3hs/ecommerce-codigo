import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Capa 1 de 3: SOLO autenticación (¿hay sesión?). La autorización vive en
// `(admin)/admin/layout.tsx` y en cada Route Handler con `requirePermission`.
// Este archivo no consulta Postgres: es el borde y una query de permisos aquí
// sería un coste fijo por request, además de duplicar la decisión.

// Abiertas sin sesión: storefront de lectura, pantallas de auth y el webhook de
// Clerk, que se autentica por firma Svix y nunca trae cookie de sesión.
const isPublicRoute = createRouteMatcher([
  "/",
  "/products(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

// El panel exige sesión aquí; QUÉ puede hacer dentro lo decide `panel.access`
// en el layout de admin.
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

// Los endpoints se gatean en su handler, que responde 401/403 con el envelope
// JSON de la app. Redirigir desde el borde convertiría un error de API en un
// 302 a HTML que ningún cliente axios sabe interpretar.
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export const proxy = clerkMiddleware(async (auth, request) => {
  if (isApiRoute(request)) {
    return;
  }

  // El admin exige sesión aunque un patrón público llegara a solaparse.
  if (!isAdminRoute(request) && isPublicRoute(request)) {
    return;
  }

  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn({ returnBackUrl: request.url });
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
