"use client";

import { MoreHorizontal, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { AssignRoleDialog } from "./assign-role-dialog";
import { ToggleUserStatusDialog } from "./toggle-user-status-dialog";

import type { UserCapabilities, UserListItem } from "../types/user";

type CustomerRowActionsProps = {
  user: UserListItem;
  capabilities: UserCapabilities;
};

export function CustomerRowActions({
  user,
  capabilities,
}: CustomerRowActionsProps) {
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // Sin ninguna acción disponible el menú sobra: un botón que solo abre un
  // desplegable vacío es ruido.
  if (!capabilities.canUpdateRole && !capabilities.canDeactivate) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="size-4" aria-hidden />
            <span className="sr-only">Acciones de {user.email}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {capabilities.canUpdateRole ? (
            <DropdownMenuItem onSelect={() => setIsRoleOpen(true)}>
              <ShieldCheck className="size-4" aria-hidden />
              Cambiar rol
            </DropdownMenuItem>
          ) : null}
          {capabilities.canDeactivate ? (
            <DropdownMenuItem
              variant={user.isActive ? "destructive" : "default"}
              onSelect={() => setIsStatusOpen(true)}
            >
              {user.isActive ? (
                <UserX className="size-4" aria-hidden />
              ) : (
                <UserCheck className="size-4" aria-hidden />
              )}
              {user.isActive ? "Desactivar" : "Reactivar"}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {isRoleOpen ? (
        <AssignRoleDialog open onOpenChange={setIsRoleOpen} user={user} />
      ) : null}
      {isStatusOpen ? (
        <ToggleUserStatusDialog
          open
          onOpenChange={setIsStatusOpen}
          user={user}
        />
      ) : null}
    </>
  );
}
