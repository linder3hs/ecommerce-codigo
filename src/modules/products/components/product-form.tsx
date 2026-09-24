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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCategories } from "@/modules/categories/hooks/use-categories";

import { CATEGORY_OPTIONS_QUERY } from "../constants";
import {
  productFormSchema,
  type CreateProductInput,
  type ProductFormInput,
  type ProductFormOutput,
} from "../schemas/product.schema";

export type ProductFormValues = ProductFormInput;

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

// El stock viaja como número: un input vacío se trata como 0, no como NaN.
function toStock(value: unknown): number {
  const text = trimmed(value);

  return text === "" ? 0 : Number(text);
}

// Los precios se capturan en soles y el schema los convierte a centavos.
function toCreateInput(values: ProductFormOutput): CreateProductInput {
  const { price, compareAtPrice, cost, ...rest } = values;

  return {
    ...rest,
    priceCents: price,
    compareAtPriceCents: compareAtPrice,
    costCents: cost,
  };
}

type ProductFormProps = {
  defaultValues: ProductFormValues;
  submitLabel: string;
  isPending: boolean;
  serverError: string | null;
  // Sin `product_cost.update` el campo Costo no se dibuja (AC6). Es solo
  // presentación: la barrera real es el 403 del `POST /api/products` ante un
  // `costCents` numérico.
  canEditCost: boolean;
  // En edición el costo se muestra pero no se toca: la única vía que lo cambia
  // es el `PATCH` auditado de Finanzas.
  isEdit: boolean;
  onSubmit: (values: CreateProductInput) => void;
  onCancel: () => void;
};

export function ProductForm({
  defaultValues,
  submitLabel,
  isPending,
  serverError,
  canEditCost,
  isEdit,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const categories = useCategories(CATEGORY_OPTIONS_QUERY);

  const form = useForm<ProductFormValues, unknown, ProductFormOutput>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
  });

  const { errors } = form.formState;

  return (
    <form
      onSubmit={form.handleSubmit((values) => onSubmit(toCreateInput(values)))}
      noValidate
    >
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
          <FieldLabel htmlFor="product-name">Nombre</FieldLabel>
          <Input
            id="product-name"
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            {...form.register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.sku)}>
            <FieldLabel htmlFor="product-sku">SKU</FieldLabel>
            <Input
              id="product-sku"
              autoComplete="off"
              placeholder="LAP-XPS13-16GB"
              aria-invalid={Boolean(errors.sku)}
              {...form.register("sku")}
            />
            <FieldDescription>
              Código interno único. Se guarda en mayúsculas.
            </FieldDescription>
            <FieldError errors={[errors.sku]} />
          </Field>

          <Field data-invalid={Boolean(errors.slug)}>
            <FieldLabel htmlFor="product-slug">Slug</FieldLabel>
            <Input
              id="product-slug"
              autoComplete="off"
              placeholder="Se genera desde el nombre si lo dejas vacío"
              aria-invalid={Boolean(errors.slug)}
              {...form.register("slug", { setValueAs: toOptional })}
            />
            <FieldDescription>
              Solo minúsculas, números y guiones.
            </FieldDescription>
            <FieldError errors={[errors.slug]} />
          </Field>
        </div>

        <Field data-invalid={Boolean(errors.categoryId)}>
          <FieldLabel htmlFor="product-category">Categoría</FieldLabel>
          <Controller
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <Select
                value={field.value || undefined}
                onValueChange={field.onChange}
                disabled={categories.isPending || categories.isError}
              >
                <SelectTrigger
                  id="product-category"
                  className="w-full"
                  aria-invalid={Boolean(errors.categoryId)}
                  onBlur={field.onBlur}
                >
                  <SelectValue
                    placeholder={
                      categories.isPending
                        ? "Cargando categorías..."
                        : "Selecciona una categoría"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {categories.data?.data.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {categories.isError ? (
            <FieldDescription className="text-destructive">
              No se pudieron cargar las categorías:{" "}
              {categories.error.message}
            </FieldDescription>
          ) : null}
          <FieldError errors={[errors.categoryId]} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field data-invalid={Boolean(errors.price)}>
            <FieldLabel htmlFor="product-price">Precio (S/)</FieldLabel>
            <Input
              id="product-price"
              inputMode="decimal"
              autoComplete="off"
              placeholder="1299.90"
              aria-invalid={Boolean(errors.price)}
              {...form.register("price")}
            />
            <FieldError errors={[errors.price]} />
          </Field>

          <Field data-invalid={Boolean(errors.compareAtPrice)}>
            <FieldLabel htmlFor="product-compare-at-price">
              Precio anterior (S/)
            </FieldLabel>
            <Input
              id="product-compare-at-price"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Opcional"
              aria-invalid={Boolean(errors.compareAtPrice)}
              {...form.register("compareAtPrice", { setValueAs: toNullable })}
            />
            <FieldError errors={[errors.compareAtPrice]} />
          </Field>

          {canEditCost ? (
            <Field data-invalid={Boolean(errors.cost)}>
              <FieldLabel htmlFor="product-cost">Costo (S/)</FieldLabel>
              {/* `disabled` en el elemento y no en `register`: la opción del
                  register haría que el valor llegue como `undefined` y
                  `productFormSchema.cost` es nullable, no opcional. */}
              <Input
                id="product-cost"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Opcional"
                disabled={isEdit}
                aria-invalid={Boolean(errors.cost)}
                {...form.register("cost", { setValueAs: toNullable })}
              />
              <FieldDescription>
                {isEdit
                  ? "Se edita en Finanzas › Precio unitario, donde queda auditado."
                  : "Vacío significa costo desconocido, no costo cero."}
              </FieldDescription>
              <FieldError errors={[errors.cost]} />
            </Field>
          ) : null}

          <Field data-invalid={Boolean(errors.stock)}>
            <FieldLabel htmlFor="product-stock">Stock</FieldLabel>
            <Input
              id="product-stock"
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={Boolean(errors.stock)}
              {...form.register("stock", { setValueAs: toStock })}
            />
            <FieldError errors={[errors.stock]} />
          </Field>
        </div>

        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="product-description">Descripción</FieldLabel>
          <Textarea
            id="product-description"
            rows={3}
            aria-invalid={Boolean(errors.description)}
            {...form.register("description", { setValueAs: toNullable })}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <Field data-invalid={Boolean(errors.imageUrl)}>
          <FieldLabel htmlFor="product-image-url">URL de imagen</FieldLabel>
          <Input
            id="product-image-url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://..."
            aria-invalid={Boolean(errors.imageUrl)}
            {...form.register("imageUrl", { setValueAs: toNullable })}
          />
          <FieldError errors={[errors.imageUrl]} />
        </Field>

        <Field orientation="horizontal">
          <FieldLabel htmlFor="product-is-active">Producto publicado</FieldLabel>
          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <Switch
                id="product-is-active"
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
