import { ImageOff } from "lucide-react";
import Image from "next/image";

import { isAllowedImageUrl } from "@/lib/image-hosts";
import { cn } from "@/lib/utils";

/**
 * El Zod de `imageUrl` ya rechaza hosts fuera de la allowlist, pero pueden
 * quedar filas viejas cargadas antes de esa restricción. Una URL así no se
 * carga: el optimizador de Next lanza con un host no configurado y tumbaría la
 * landing entera, y servirla sin optimizar traería contenido de un origen
 * arbitrario. Se degrada al marcador, igual que cuando `image_url` es null.
 */
function isRenderableSource(src: string): boolean {
  return src.startsWith("/") || isAllowedImageUrl(src);
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
  const source = src !== null && isRenderableSource(src) ? src : null;

  return (
    <div className={cn("bg-sunk relative size-full overflow-hidden", className)}>
      {source === null ? (
        <div className="text-ink-muted flex size-full items-center justify-center">
          <ImageOff aria-hidden className="size-6" />
          <span className="sr-only">{alt}</span>
        </div>
      ) : (
        <Image
          src={source}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("object-cover", imageClassName)}
        />
      )}
    </div>
  );
}
