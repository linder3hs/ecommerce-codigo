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

import { useDeleteCategory } from "../hooks/use-category-mutations";
import type { Category } from "../types/category";

type DeleteCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category;
};

export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
}: DeleteCategoryDialogProps) {
  const deleteCategory = useDeleteCategory();

  function handleConfirm() {
    deleteCategory.mutate(category.id, {
      onSuccess: () => {
        toast.success(`Se eliminó la categoría "${category.name}".`);
        onOpenChange(false);
      },
      onError: (error: Error) => toast.error(error.message),
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Eliminar la categoría &quot;{category.name}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Dejará de aparecer en el listado y en el catálogo. Esta acción no se
            puede deshacer desde el panel.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteCategory.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteCategory.isPending}
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
          >
            {deleteCategory.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
