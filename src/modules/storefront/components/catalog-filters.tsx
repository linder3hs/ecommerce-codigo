"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePublicCategories } from "@/modules/categories/hooks/use-public-categories";

import {
  hasActiveFilters,
  PRICE_RANGES,
  type CatalogPatch,
  type CatalogState,
} from "../lib/catalog";
import { CARD, CHIP, CHIP_ON, PILL, PILL_QUIET } from "../lib/styles";
import { StorefrontError } from "./storefront-error";

const SECTION_LABEL =
  "text-ink-muted text-[11.5px] font-semibold tracking-[0.05em] uppercase";

type ChipProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(CHIP, active && CHIP_ON)}
    >
      {label}
    </button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6.5">
      <p className={SECTION_LABEL}>{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

type CatalogFiltersProps = {
  state: CatalogState;
  onChange: (patch: CatalogPatch) => void;
  onClear: () => void;
};

/**
 * Sidebar de filtros. No conoce la URL ni la consulta: recibe el estado y
 * emite parches, y quien lo monta decide cómo se escriben (hoy, en la URL).
 *
 * La categoría es single-select porque `listPublic` filtra por un slug: el
 * segundo click sobre el chip activo lo deselecciona.
 */
export function CatalogFilters({
  state,
  onChange,
  onClear,
}: CatalogFiltersProps) {
  const categoriesQuery = usePublicCategories();

  return (
    <aside
      aria-label="Filtros"
      className={cn(
        CARD,
        "shrink-0 px-6 py-6.5 lg:w-[300px] lg:overflow-y-auto",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[17px] font-semibold tracking-[-0.025em]">Filtros</p>
        {hasActiveFilters(state) ? (
          <button
            type="button"
            onClick={onClear}
            className={cn(
              PILL,
              PILL_QUIET,
              "text-ink-muted h-8 px-[13px] text-[12.5px]",
            )}
          >
            Limpiar
          </button>
        ) : null}
      </div>

      <Section title="Categoría">
        {categoriesQuery.isError ? (
          <StorefrontError
            message="No pudimos cargar las categorías."
            onRetry={() => void categoriesQuery.refetch()}
            className="w-full p-2"
          />
        ) : categoriesQuery.isPending ? (
          Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-[34px] w-[92px] rounded-full" />
          ))
        ) : (
          categoriesQuery.data.data.map((category) => (
            <Chip
              key={category.id}
              label={category.name}
              active={state.category === category.slug}
              onClick={() =>
                onChange({
                  category:
                    state.category === category.slug ? null : category.slug,
                })
              }
            />
          ))
        )}
      </Section>

      <Section title="Precio">
        <Chip
          label="Todos"
          active={state.price === null}
          onClick={() => onChange({ price: null })}
        />
        {PRICE_RANGES.map((range) => (
          <Chip
            key={range.id}
            label={range.label}
            active={state.price === range.id}
            onClick={() =>
              onChange({ price: state.price === range.id ? null : range.id })
            }
          />
        ))}
      </Section>

      <Section title="Disponibilidad">
        <Chip
          label="Con stock"
          active={state.stock}
          onClick={() => onChange({ stock: !state.stock })}
        />
        <Chip
          label="En oferta"
          active={state.deals}
          onClick={() => onChange({ deals: !state.deals })}
        />
      </Section>
    </aside>
  );
}
