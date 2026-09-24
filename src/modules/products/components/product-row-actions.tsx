"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { Product } from "../types/product";

import { DeleteProductDialog } from "./delete-product-dialog";
import { ProductFormDialog } from "./product-form-dialog";

type ProductRowActionsProps = {
  product: Product;
  // Solo se reenvía al formulario de edición, que decide si dibuja el campo
  // Costo. Las acciones de la fila no dependen del permiso del costo.
  canEditCost: boolean;
};

export function ProductRowActions({
  product,
  canEditCost,
}: ProductRowActionsProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="size-4" aria-hidden />
            <span className="sr-only">
              Acciones del producto {product.name}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
            <Pencil className="size-4" aria-hidden />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="size-4" aria-hidden />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isEditOpen ? (
        <ProductFormDialog
          open
          onOpenChange={setIsEditOpen}
          product={product}
          canEditCost={canEditCost}
        />
      ) : null}
      {isDeleteOpen ? (
        <DeleteProductDialog
          open
          onOpenChange={setIsDeleteOpen}
          product={product}
        />
      ) : null}
    </>
  );
}
