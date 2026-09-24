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
import type {
  CreateProductInput,
  UpdateProductInput,
} from "../schemas/product.schema";
import type { Product } from "../types/product";

import { ProductForm, type ProductFormValues } from "./product-form";

type ProductFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product;
  canEditCost: boolean;
};

const BLANK_VALUES: ProductFormValues = {
  name: "",
  slug: undefined,
  sku: "",
  description: null,
  price: "",
  compareAtPrice: null,
  cost: null,
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
    // `costCents` ausente (sin `product_cost.view`) y `null` (costo desconocido)
    // se editan igual: campo vacío. El costo no se manda en el PATCH de
    // producto, así que un campo vacío aquí no borra el costo guardado.
    cost:
      product.costCents == null ? null : centsToAmountInput(product.costCents),
    stock: product.stock,
    categoryId: product.categoryId,
    imageUrl: product.imageUrl,
    isActive: product.isActive,
  };
}

/**
 * El costo no viaja en el `PATCH`. `updateProductSchema` ya lo descartaría en
 * silencio, pero se quita en origen por dos razones: un body con `costCents`
 * sugiere que este formulario puede cambiarlo, y si algún día el schema dejara
 * de omitirlo, el formulario empezaría a escribir costos sin auditoría. La única
 * vía es el `PATCH` de Finanzas, que registra el valor anterior.
 *
 * Se borra la clave en vez de destructurarla: un `const { costCents, ...rest }`
 * deja una variable sin usar y el proyecto no admite warnings de lint.
 */
function toUpdateInput(values: CreateProductInput): UpdateProductInput {
  const input: UpdateProductInput & Pick<CreateProductInput, "costCents"> = {
    ...values,
  };

  delete input.costCents;

  return input;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  canEditCost,
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
      updateProduct.mutate(
        { id: product.id, input: toUpdateInput(values) },
        handlers,
      );

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
          canEditCost={canEditCost}
          isEdit={isEdit}
          onSubmit={handleSubmit}
          onCancel={close}
        />
      </DialogContent>
    </Dialog>
  );
}
