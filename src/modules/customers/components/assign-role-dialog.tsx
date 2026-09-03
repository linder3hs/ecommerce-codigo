"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";

import { useUpdateUserRole } from "../hooks/use-user-mutations";

import { RoleSelect } from "./role-select";

import type { UserListItem } from "../types/user";

type AssignRoleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserListItem;
};

export function AssignRoleDialog({
  open,
  onOpenChange,
  user,
}: AssignRoleDialogProps) {
  const [roleId, setRoleId] = useState(user.role?.id ?? "");
  const [serverError, setServerError] = useState<string | null>(null);
  const updateRole = useUpdateUserRole();

  const isUnchanged = roleId === "" || roleId === user.role?.id;

  function handleConfirm() {
    setServerError(null);

    updateRole.mutate(
      { id: user.id, input: { roleId } },
      {
        onSuccess: (updated) => {
          toast.success(
            `${updated.email} ahora es ${updated.role?.name ?? "Cliente"}.`,
          );
          onOpenChange(false);
        },
        onError: (error: Error) => setServerError(error.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar rol</DialogTitle>
          <DialogDescription>
            El rol define qué puede hacer {user.email} dentro del panel. Un
            usuario tiene un solo rol: el nuevo reemplaza al anterior.
          </DialogDescription>
        </DialogHeader>

        {serverError ? (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          >
            {serverError}
          </p>
        ) : null}

        <Field>
          <FieldLabel htmlFor="assign-role">Rol</FieldLabel>
          <RoleSelect
            id="assign-role"
            valueKey="id"
            value={roleId}
            onValueChange={setRoleId}
            disabled={updateRole.isPending}
          />
        </Field>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateRole.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isUnchanged || updateRole.isPending}
          >
            {updateRole.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            Guardar rol
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
