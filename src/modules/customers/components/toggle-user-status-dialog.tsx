"use client";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useUpdateUserStatus } from "../hooks/use-user-mutations";

import type { UserListItem } from "../types/user";

type ToggleUserStatusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserListItem;
};

export function ToggleUserStatusDialog({
  open,
  onOpenChange,
  user,
}: ToggleUserStatusDialogProps) {
  const updateStatus = useUpdateUserStatus();
  const nextIsActive = !user.isActive;

  function handleConfirm() {
    updateStatus.mutate(
      { id: user.id, input: { isActive: nextIsActive } },
      {
        onSuccess: () => {
          toast.success(
            nextIsActive
              ? `Se reactivó a ${user.email}.`
              : `Se desactivó a ${user.email}.`,
          );
          onOpenChange(false);
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {nextIsActive
              ? `¿Reactivar a ${user.email}?`
              : `¿Desactivar a ${user.email}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {nextIsActive
              ? "Recuperará el acceso que le dé su rol."
              : "Perderá el acceso al panel y a su cuenta en la aplicación. No se borra nada: su historial de auditoría se conserva."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={updateStatus.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            variant={nextIsActive ? "default" : "destructive"}
            disabled={updateStatus.isPending}
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
          >
            {updateStatus.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {nextIsActive ? "Reactivar" : "Desactivar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
