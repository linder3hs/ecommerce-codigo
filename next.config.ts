import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // `products.image_url` y `categories.image_url` del seed apuntan a
    // Unsplash: sin este patrón `next/image` rechaza la URL en tiempo de
    // render. Se abre el host completo, no una ruta concreta, porque el id de
    // cada foto lo decide el dato, no el código.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
