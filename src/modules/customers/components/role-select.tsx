"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoles } from "@/modules/roles/hooks/use-roles";

import { ALL_FILTER_VALUE } from "../constants";

type RoleSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  // El filtro del listado trabaja con ids y la invitación con slugs: los ids de
  // `roles` son aleatorios por entorno y no sirven como referencia estable.
  valueKey: "id" | "slug";
  /** Si se pasa, añade la opción sin filtro con esta etiqueta. */
  allOptionLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  className?: string;
};

export function RoleSelect({
  value,
  onValueChange,
  valueKey,
  allOptionLabel,
  placeholder = "Elige un rol",
  disabled,
  id,
  className,
  ...aria
}: RoleSelectProps) {
  const roles = useRoles();

  const isBlocked = roles.isPending || roles.isError;

  return (
    <div className="flex flex-col gap-1">
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || isBlocked}
      >
        <SelectTrigger id={id} className={className} {...aria}>
          <SelectValue
            placeholder={roles.isPending ? "Cargando roles…" : placeholder}
          />
        </SelectTrigger>
        <SelectContent>
          {allOptionLabel ? (
            <SelectItem value={ALL_FILTER_VALUE}>{allOptionLabel}</SelectItem>
          ) : null}
          {(roles.data ?? []).map((role) => (
            <SelectItem key={role.id} value={role[valueKey]}>
              {role.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {roles.isError ? (
        <p role="alert" className="text-destructive text-xs">
          No se pudieron cargar los roles. {roles.error.message}
        </p>
      ) : null}
    </div>
  );
}
