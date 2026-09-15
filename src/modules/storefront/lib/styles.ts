/**
 * Clases repetidas del storefront. El diseño usa cuatro formas —tarjeta,
 * botón circular, píldora y etiqueta— en casi todos los bloques: escribirlas
 * una vez evita que la misma sombra o el mismo radio se escriban de doce
 * maneras distintas. No son componentes porque no tienen comportamiento: son
 * la hoja de estilo del módulo.
 */

// Curva del diseño: ease [.22, 1, .36, 1] en todo lo que se mueve.
export const EASE_OUT = "ease-[cubic-bezier(0.22,1,0.36,1)]";

export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]";

export const CARD = "rounded-bento-sm bg-surface shadow-soft lg:rounded-bento";

export const CIRC = `inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-sunk text-ink transition-[background-color,transform] duration-200 hover:bg-[color-mix(in_oklch,var(--sunk),var(--ink)_8%)] active:scale-[0.94] disabled:pointer-events-none disabled:opacity-40 ${FOCUS_RING}`;

export const CIRC_DARK =
  "bg-ink text-surface hover:bg-[color-mix(in_oklch,var(--ink),var(--ink-muted)_22%)]";

// Stepper de cantidad de la tarjeta: la misma altura que `CIRC` para que la
// fila no salte al pasar de botón a stepper, y `shrink-0` porque el bloque de
// precio de al lado es el que trunca.
export const STEPPER =
  "inline-flex shrink-0 items-center gap-0.5 rounded-full bg-sunk p-[3px]";

export const STEPPER_DARK = "bg-ink text-surface";

// Stepper con el acento de la acción principal: se combina con `PILL` —no con
// `PILL_BRAND`— porque el contenedor no es un botón y no debe oscurecerse
// entero al pasar el cursor; el hover vive en los círculos de dentro.
export const STEPPER_BRAND = "bg-brand text-on-brand";

export const PILL = `inline-flex items-center gap-2.5 rounded-full font-medium transition-[background-color,transform] duration-200 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40 ${FOCUS_RING}`;

export const PILL_BRAND =
  "bg-brand text-on-brand hover:bg-[color-mix(in_oklch,var(--brand),black_8%)]";

export const PILL_QUIET =
  "bg-sunk text-ink hover:bg-[color-mix(in_oklch,var(--sunk),var(--ink)_8%)]";

// Chip de filtro. Seleccionado invierte a tinta y no al acento: el acento
// queda reservado para la acción principal de cada vista.
export const CHIP = `inline-flex h-[34px] items-center gap-[7px] rounded-full bg-sunk px-3.5 text-[13px] font-medium text-ink-muted transition-[background-color,color,transform] duration-200 hover:text-ink active:scale-[0.96] ${FOCUS_RING}`;

export const CHIP_ON = "bg-ink text-surface hover:text-surface";

export const TAG =
  "inline-flex h-[30px] items-center gap-[7px] rounded-full bg-sunk px-[13px] text-[12px] font-medium text-ink-muted";

export const LIFT = `transition-[transform,box-shadow] duration-[260ms] ${EASE_OUT} hover:-translate-y-1 hover:shadow-float`;

export const ZOOM = `transition-transform duration-500 ${EASE_OUT} group-hover:scale-[1.06]`;

export const MONO = "font-mono tabular-nums";
