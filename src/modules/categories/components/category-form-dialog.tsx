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

import {
  useCreateCategory,
  useUpdateCategory,
} from "../hooks/use-category-mutations";
import type { CreateCategoryInput } from "../schemas/category.schema";
import type { Category } from "../types/category";

import { CategoryForm, type CategoryFormValues } from "./category-form";

type CategoryFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category;
};

const BLANK_VALUES: CategoryFormValues = {
  name: "",
  slug: undefined,
  description: null,
  imageUrl: null,
  isActive: true,
};

function toFormValues(category: Category | undefined): CategoryFormValues {
  if (!category) {
    return BLANK_VALUES;
  }

  return {
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.imageUrl,
    isActive: category.isActive,
  };
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
}: CategoryFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const isEdit = category !== undefined;
  const isPending = createCategory.isPending || updateCategory.isPending;

  function close() {
    setServerError(null);
    onOpenChange(false);
  }

  function handleSubmit(values: CreateCategoryInput) {
    setServerError(null);

    const handlers = {
      onSuccess: () => {
        toast.success(isEdit ? "Categoría actualizada." : "Categoría creada.");
        close();
      },
      onError: (error: Error) => setServerError(error.message),
    };

    if (category) {
      updateCategory.mutate({ id: category.id, input: values }, handlers);

      return;
    }

    createCategory.mutate(values, handlers);
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
          <DialogTitle>
            {isEdit ? "Editar categoría" : "Nueva categoría"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos de la categoría."
              : "Completa los datos para crear una categoría."}
          </DialogDescription>
        </DialogHeader>
        <CategoryForm
          key={category?.id ?? "new"}
          defaultValues={toFormValues(category)}
          submitLabel={isEdit ? "Guardar cambios" : "Crear categoría"}
          isPending={isPending}
          serverError={serverError}
          onSubmit={handleSubmit}
          onCancel={close}
        />
      </DialogContent>
    </Dialog>
  );
}
