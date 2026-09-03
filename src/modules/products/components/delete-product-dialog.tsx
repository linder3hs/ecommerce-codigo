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

import { useDeleteProduct } from "../hooks/use-product-mutations";
import type { Product } from "../types/product";

type DeleteProductDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
};

export function DeleteProductDialog({
  open,
  onOpenChange,
  product,
}: DeleteProductDialogProps) {
  const deleteProduct = useDeleteProduct();

  function handleConfirm() {
    deleteProduct.mutate(product.id, {
      onSuccess: () => {
        toast.success(`Se eliminó el producto "${product.name}".`);
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
            ¿Eliminar el producto &quot;{product.name}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Dejará de aparecer en el listado y en el catálogo, y su SKU y slug
            quedarán libres. Esta acción no se puede deshacer desde el panel.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteProduct.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteProduct.isPending}
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
          >
            {deleteProduct.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
