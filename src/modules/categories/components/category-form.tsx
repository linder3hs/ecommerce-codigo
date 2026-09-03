"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import {
  createCategorySchema,
  type CreateCategoryInput,
} from "../schemas/category.schema";

export type CategoryFormValues = z.input<typeof createCategorySchema>;

// `setValueAs` también corre sobre el valor por defecto, que aquí puede ser
// null o undefined, no solo el string que teclea el usuario.
function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toNullable(value: unknown): string | null {
  return trimmed(value) || null;
}

function toOptional(value: unknown): string | undefined {
  return trimmed(value) || undefined;
}

type CategoryFormProps = {
  defaultValues: CategoryFormValues;
  submitLabel: string;
  isPending: boolean;
  serverError: string | null;
  onSubmit: (values: CreateCategoryInput) => void;
  onCancel: () => void;
};

export function CategoryForm({
  defaultValues,
  submitLabel,
  isPending,
  serverError,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  const form = useForm<CategoryFormValues, unknown, CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues,
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

        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="category-name">Nombre</FieldLabel>
          <Input
            id="category-name"
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            {...form.register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={Boolean(errors.slug)}>
          <FieldLabel htmlFor="category-slug">Slug</FieldLabel>
          <Input
            id="category-slug"
            autoComplete="off"
            placeholder="Se genera desde el nombre si lo dejas vacío"
            aria-invalid={Boolean(errors.slug)}
            {...form.register("slug", { setValueAs: toOptional })}
          />
          <FieldDescription>
            Solo minúsculas, números y guiones. Es la URL pública de la
            categoría.
          </FieldDescription>
          <FieldError errors={[errors.slug]} />
        </Field>

        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="category-description">Descripción</FieldLabel>
          <Textarea
            id="category-description"
            rows={3}
            aria-invalid={Boolean(errors.description)}
            {...form.register("description", { setValueAs: toNullable })}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <Field data-invalid={Boolean(errors.imageUrl)}>
          <FieldLabel htmlFor="category-image-url">URL de imagen</FieldLabel>
          <Input
            id="category-image-url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://..."
            aria-invalid={Boolean(errors.imageUrl)}
            {...form.register("imageUrl", { setValueAs: toNullable })}
          />
          <FieldError errors={[errors.imageUrl]} />
        </Field>

        <Field orientation="horizontal">
          <FieldLabel htmlFor="category-is-active">
            Categoría publicada
          </FieldLabel>
          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <Switch
                id="category-is-active"
                checked={field.value ?? true}
                onCheckedChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
              />
            )}
          />
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
            {submitLabel}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
