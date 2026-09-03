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
import { centsToAmountInput } from "@/lib/format";

import {
  useCreateProduct,
  useUpdateProduct,
} from "../hooks/use-product-mutations";
import type { CreateProductInput } from "../schemas/product.schema";
import type { Product } from "../types/product";

import { ProductForm, type ProductFormValues } from "./product-form";

type ProductFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
};

const BLANK_VALUES: ProductFormValues = {
  name: "",
  slug: undefined,
  sku: "",
  description: null,
  price: "",
  compareAtPrice: null,
  stock: 0,
  categoryId: "",
  imageUrl: null,
  isActive: true,
};

function toFormValues(product: Product | undefined): ProductFormValues {
  if (!product) {
    return BLANK_VALUES;
  }

  return {
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    description: product.description,
    price: centsToAmountInput(product.priceCents),
    compareAtPrice:
      product.compareAtPriceCents === null
        ? null
        : centsToAmountInput(product.compareAtPriceCents),
    stock: product.stock,
    categoryId: product.categoryId,
    imageUrl: product.imageUrl,
    isActive: product.isActive,
  };
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
}: ProductFormDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const isEdit = product !== undefined;
  const isPending = createProduct.isPending || updateProduct.isPending;

  function close() {
    setServerError(null);
    onOpenChange(false);
  }

  function handleSubmit(values: CreateProductInput) {
    setServerError(null);

    const handlers = {
      onSuccess: () => {
        toast.success(isEdit ? "Producto actualizado." : "Producto creado.");
        close();
      },
      onError: (error: Error) => setServerError(error.message),
    };

    if (product) {
      updateProduct.mutate({ id: product.id, input: values }, handlers);

      return;
    }

    createProduct.mutate(values, handlers);
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos del producto."
              : "Completa los datos para crear un producto."}
          </DialogDescription>
        </DialogHeader>
        <ProductForm
          key={product?.id ?? "new"}
          defaultValues={toFormValues(product)}
          submitLabel={isEdit ? "Guardar cambios" : "Crear producto"}
          isPending={isPending}
          serverError={serverError}
          onSubmit={handleSubmit}
          onCancel={close}
        />
      </DialogContent>
    </Dialog>
  );
}
