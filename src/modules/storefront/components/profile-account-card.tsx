import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import { CARD, MONO, TAG } from "../lib/styles";

type ProfileAccountCardProps = {
  imageUrl: string;
  fullName: string;
  email: string;
  /** Ya formateado por quien lo lee: la tarjeta no sabe de zonas horarias. */
  memberSince: string;
  roleName: string;
};

/** Iniciales para cuando la foto de Clerk no carga. */
function initials(fullName: string): string {
  return fullName
    .split(" ")
    .filter((part) => part !== "")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Field({ label, children }: { label: string; children: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-ink-muted text-[12.5px]">{label}</dt>
      <dd className="text-[15px] font-medium break-words">{children}</dd>
    </div>
  );
}

/**
 * Datos de la cuenta en solo lectura. Recibe todo por props —sin Clerk ni
 * repositorios dentro— para que la página sea el único punto que decide de
 * dónde sale cada dato y este bloque se pueda pintar en cualquier contexto.
 */
export function ProfileAccountCard({
  imageUrl,
  fullName,
  email,
  memberSince,
  roleName,
}: ProfileAccountCardProps) {
  return (
    <section className={cn(CARD, "flex flex-col gap-6 p-5 lg:p-8")}>
      <header className="flex items-center gap-4">
        <Avatar className="size-16 lg:size-20">
          <AvatarImage src={imageUrl} alt="" />
          <AvatarFallback className="text-[18px]">
            {initials(fullName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0">
          <h2 className="truncate text-[20px] font-semibold tracking-[-0.02em] lg:text-[24px]">
            {fullName}
          </h2>
          <span className={cn(TAG, "mt-2")}>{roleName}</span>
        </div>
      </header>

      <dl className="grid gap-5 sm:grid-cols-2">
        <Field label="Email">{email}</Field>
        <div className="flex flex-col gap-1">
          <dt className="text-ink-muted text-[12.5px]">Miembro desde</dt>
          <dd className={cn(MONO, "text-[15px] font-medium")}>{memberSince}</dd>
        </div>
      </dl>
    </section>
  );
}
