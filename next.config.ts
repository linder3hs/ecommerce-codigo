import type { NextConfig } from "next";

import { ALLOWED_IMAGE_HOSTS } from "./src/lib/image-hosts";

const nextConfig: NextConfig = {
  images: {
    // Derivado de la allowlist de `src/lib/image-hosts.ts`, la misma que valida
    // el Zod de `imageUrl` y filtra `ProductPhoto`: un host que no esté ahí no
    // llega a la BD ni se renderiza. Se abre el host completo, no una ruta
    // concreta, porque el id de cada foto lo decide el dato, no el código.
    remotePatterns: ALLOWED_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname,
      pathname: "/**",
    })),
  },
};

export default nextConfig;
