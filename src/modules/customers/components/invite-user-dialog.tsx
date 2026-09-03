"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useInviteUser } from "../hooks/use-user-mutations";

import { InviteUserForm } from "./invite-user-form";

import type { InviteUserInput } from "../schemas/user.schema";

type InviteUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InviteUserDialog({
  open,
  onOpenChange,
}: InviteUserDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const inviteUser = useInviteUser();

  function close() {
    setServerError(null);
    onOpenChange(false);
  }

  function handleSubmit(values: InviteUserInput) {
    setServerError(null);

    inviteUser.mutate(values, {
      onSuccess: (invitation) => {
        toast.success(`Invitación enviada a ${invitation.email}.`);
        close();
      },
      onError: (error: Error) => setServerError(error.message),
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          close();

          return;
        }

        onOpenChange(true);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar usuario</DialogTitle>
          <DialogDescription>
            Le enviamos un correo para que se registre. Aparecerá en el listado
            cuando acepte.
          </DialogDescription>
        </DialogHeader>
        {/* `key` remonta el formulario en cada apertura: sin esto conservaría
            el correo de la invitación anterior. */}
        <InviteUserForm
          key={open ? "open" : "closed"}
          isPending={inviteUser.isPending}
          serverError={serverError}
          onSubmit={handleSubmit}
          onCancel={close}
        />
      </DialogContent>
    </Dialog>
  );
}
