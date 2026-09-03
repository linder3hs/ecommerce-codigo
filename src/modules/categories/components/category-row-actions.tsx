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

import type { Category } from "../types/category";

import { CategoryFormDialog } from "./category-form-dialog";
import { DeleteCategoryDialog } from "./delete-category-dialog";

export function CategoryRowActions({ category }: { category: Category }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="size-4" aria-hidden />
            <span className="sr-only">
              Acciones de la categoría {category.name}
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
        <CategoryFormDialog
          open
          onOpenChange={setIsEditOpen}
          category={category}
        />
      ) : null}
      {isDeleteOpen ? (
        <DeleteCategoryDialog
          open
          onOpenChange={setIsDeleteOpen}
          category={category}
        />
      ) : null}
    </>
  );
}
