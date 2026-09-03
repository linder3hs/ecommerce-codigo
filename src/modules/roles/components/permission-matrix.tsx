"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { resourceLabel } from "../constants";

import type { Permission } from "../types/permission";

type PermissionMatrixProps = {
  permissions: Permission[];
  selectedIds: ReadonlySet<string>;
  disabled: boolean;
  onToggle: (permissionId: string, checked: boolean) => void;
};

type PermissionGroup = {
  resource: string;
  label: string;
  permissions: Permission[];
};

// El catálogo ya llega ordenado por `resource` y `action` desde el servidor:
// agrupar en memoria mantiene ese orden sin volver a ordenar.
function groupByResource(permissions: Permission[]): PermissionGroup[] {
  const groups = new Map<string, PermissionGroup>();

  for (const permission of permissions) {
    const group = groups.get(permission.resource) ?? {
      resource: permission.resource,
      label: resourceLabel(permission.resource),
      permissions: [],
    };

    group.permissions.push(permission);
    groups.set(permission.resource, group);
  }

  return [...groups.values()];
}

export function PermissionMatrix({
  permissions,
  selectedIds,
  disabled,
  onToggle,
}: PermissionMatrixProps) {
  const groups = groupByResource(permissions);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.resource} className="flex flex-col gap-3">
          <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {group.label}
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {group.permissions.map((permission) => {
              const inputId = `permission-${permission.id}`;

              return (
                <li
                  key={permission.id}
                  className="flex items-start gap-3 rounded-md border p-3"
                >
                  <Checkbox
                    id={inputId}
                    checked={selectedIds.has(permission.id)}
                    disabled={disabled}
                    onCheckedChange={(checked) =>
                      onToggle(permission.id, checked === true)
                    }
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor={inputId}
                    className="text-sm leading-snug font-normal"
                  >
                    {/* Nunca el `code` ni el `action` crudos: la persona lee la
                        descripción en español que trae la tabla semilla. */}
                    {permission.description ?? "Permiso sin descripción."}
                  </Label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
