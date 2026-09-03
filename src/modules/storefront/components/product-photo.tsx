import { ImageOff } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Espejo de `images.remotePatterns` en `next.config.ts`. `image_url` lo escribe
 * quien carga el producto en el panel, así que puede apuntar a cualquier host:
 * el optimizador de Next lanza una excepción con un host no configurado y
 * tumbaría la landing entera. Fuera de la lista la foto se sirve sin optimizar,
 * que es peor rendimiento pero no una página rota.
 */
const OPTIMIZED_HOSTS = new Set(["images.unsplash.com"]);

function isOptimizedSource(src: string): boolean {
  if (src.startsWith("/")) {
    return true;
  }

  try {
    return OPTIMIZED_HOSTS.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

type ProductPhotoProps = {
  src: string | null;
  alt: string;
  /** Ancho renderizado por breakpoint: sin esto `next/image` sirve el original. */
  sizes: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

/**
 * Foto de producto o categoría. `image_url` es nullable en el schema, así que
 * el hueco vacío es un estado del dato, no un error: se dibuja un marcador en
 * vez de dejar un `alt` roto.
 */
export function ProductPhoto({
  src,
  alt,
  sizes,
  className,
  imageClassName,
  priority = false,
}: ProductPhotoProps) {
  return (
    <div className={cn("bg-sunk relative size-full overflow-hidden", className)}>
      {src === null ? (
        <div className="text-ink-muted flex size-full items-center justify-center">
          <ImageOff aria-hidden className="size-6" />
          <span className="sr-only">{alt}</span>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={!isOptimizedSource(src)}
          className={cn("object-cover", imageClassName)}
        />
      )}
    </div>
  );
}
