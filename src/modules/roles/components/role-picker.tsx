"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { RoleWithPermissions } from "../types/role";

type RolePickerProps = {
  roles: RoleWithPermissions[];
  selectedRoleId: string | null;
  onSelect: (roleId: string) => void;
};

export function RolePicker({
  roles,
  selectedRoleId,
  onSelect,
}: RolePickerProps) {
  return (
    <nav aria-label="Roles del sistema">
      <ul className="flex flex-col gap-1">
        {roles.map((role) => {
          const isSelected = role.id === selectedRoleId;

          return (
            <li key={role.id}>
              <button
                type="button"
                onClick={() => onSelect(role.id)}
                aria-current={isSelected ? "true" : undefined}
                className={cn(
                  "flex w-full flex-col gap-1 rounded-md border px-3 py-2 text-left transition-colors",
                  isSelected
                    ? "border-primary bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground border-transparent",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{role.name}</span>
                  <Badge variant="secondary">{role.permissions.length}</Badge>
                </span>
                {role.description ? (
                  <span className="text-muted-foreground text-xs">
                    {role.description}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
