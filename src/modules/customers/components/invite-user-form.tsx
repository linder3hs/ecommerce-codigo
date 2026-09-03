"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import {
  inviteUserSchema,
  type InviteUserInput,
} from "../schemas/user.schema";

import { RoleSelect } from "./role-select";

import type { z } from "zod";

export type InviteUserFormValues = z.input<typeof inviteUserSchema>;

const BLANK_VALUES: InviteUserFormValues = { email: "", roleSlug: "" };

type InviteUserFormProps = {
  isPending: boolean;
  serverError: string | null;
  onSubmit: (values: InviteUserInput) => void;
  onCancel: () => void;
};

export function InviteUserForm({
  isPending,
  serverError,
  onSubmit,
  onCancel,
}: InviteUserFormProps) {
  const form = useForm<InviteUserFormValues, unknown, InviteUserInput>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: BLANK_VALUES,
  });

  const { errors } = form.formState;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {serverError ? (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          >
            {serverError}
          </p>
        ) : null}

        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="invite-email">Correo electrónico</FieldLabel>
          <Input
            id="invite-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="persona@empresa.com"
            aria-invalid={Boolean(errors.email)}
            {...form.register("email")}
          />
          <FieldDescription>
            Recibirá un enlace para crear su contraseña. Nadie la escribe por
            ella.
          </FieldDescription>
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={Boolean(errors.roleSlug)}>
          <FieldLabel htmlFor="invite-role">Rol</FieldLabel>
          <Controller
            control={form.control}
            name="roleSlug"
            render={({ field }) => (
              <RoleSelect
                id="invite-role"
                valueKey="slug"
                value={field.value ?? ""}
                onValueChange={field.onChange}
                disabled={isPending}
                aria-invalid={Boolean(errors.roleSlug)}
              />
            )}
          />
          <FieldDescription>
            Se aplicará automáticamente cuando acepte la invitación.
          </FieldDescription>
          <FieldError errors={[errors.roleSlug]} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            Enviar invitación
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
