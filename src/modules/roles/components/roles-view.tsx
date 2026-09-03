"use client";

import { Lock, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import { useRoles } from "../hooks/use-roles";
import { usePermissions } from "../hooks/use-permissions";
import { useUpdateRolePermissions } from "../hooks/use-role-mutations";

import { PermissionMatrix } from "./permission-matrix";
import { RolePicker } from "./role-picker";

type RolesViewProps = {
  // Lo resuelve el Server Component con los permisos efectivos del usuario. Es
  // solo presentación: la barrera real es `requirePermission` en el handler.
  canManagePermissions: boolean;
};

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const reference = new Set(a);

  return b.every((id) => reference.has(id));
}

export function RolesView({ canManagePermissions }: RolesViewProps) {
  const roles = useRoles();
  const permissions = usePermissions();
  const updatePermissions = useUpdateRolePermissions();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  // `null` significa "sin cambios locales": la matriz muestra lo guardado.
  const [draftIds, setDraftIds] = useState<string[] | null>(null);

  const roleList = roles.data ?? [];
  const selectedRole =
    roleList.find((role) => role.id === selectedRoleId) ?? roleList[0] ?? null;

  const savedIds = useMemo(
    () => selectedRole?.permissions.map((permission) => permission.id) ?? [],
    [selectedRole],
  );

  const currentIds = draftIds ?? savedIds;
  const selectedIds = useMemo(() => new Set(currentIds), [currentIds]);
  const isDirty = draftIds !== null && !sameSet(draftIds, savedIds);

  const isLoading = roles.isPending || permissions.isPending;
  const isError = roles.isError || permissions.isError;

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    const message =
      roles.error?.message ??
      permissions.error?.message ??
      "Ocurrió un error inesperado.";

    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
        <TriangleAlert className="text-destructive size-6" aria-hidden />
        <div>
          <p className="font-medium">
            No se pudieron cargar los roles y permisos.
          </p>
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void roles.refetch();
            void permissions.refetch();
          }}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  if (!selectedRole) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="font-medium">No hay roles configurados.</p>
        <p className="text-muted-foreground text-sm">
          Ejecuta la carga inicial de datos para crear los roles del sistema.
        </p>
      </div>
    );
  }

  function handleSelectRole(roleId: string) {
    setSelectedRoleId(roleId);
    setDraftIds(null);
  }

  function handleToggle(permissionId: string, checked: boolean) {
    const next = checked
      ? [...currentIds, permissionId]
      : currentIds.filter((id) => id !== permissionId);

    setDraftIds(next);
  }

  function handleSave() {
    if (!selectedRole || draftIds === null) {
      return;
    }

    updatePermissions.mutate(
      { id: selectedRole.id, input: { permissionIds: draftIds } },
      {
        onSuccess: () => {
          toast.success("Permisos del rol actualizados.");
          setDraftIds(null);
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <RolePicker
        roles={roleList}
        selectedRoleId={selectedRole.id}
        onSelect={handleSelectRole}
      />

      <section className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{selectedRole.name}</h2>
          <p className="text-muted-foreground text-sm">
            Marca lo que este rol puede hacer. Se guarda el set completo: lo que
            quede sin marcar se revoca.
          </p>
        </header>

        {!canManagePermissions ? (
          <p className="text-muted-foreground flex items-center gap-2 rounded-md border border-dashed p-3 text-sm">
            <Lock className="size-4 shrink-0" aria-hidden />
            Estás viendo la matriz en solo lectura: no tienes permiso para
            modificarla.
          </p>
        ) : null}

        <Separator />

        <PermissionMatrix
          permissions={permissions.data ?? []}
          selectedIds={selectedIds}
          disabled={!canManagePermissions || updatePermissions.isPending}
          onToggle={handleToggle}
        />

        {canManagePermissions ? (
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => setDraftIds(null)}
              disabled={!isDirty || updatePermissions.isPending}
            >
              Descartar cambios
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isDirty || updatePermissions.isPending}
            >
              {updatePermissions.isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
