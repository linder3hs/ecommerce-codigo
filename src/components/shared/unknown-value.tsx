type UnknownValueProps = {
  /** Lo que oye el lector de pantalla en lugar del guion. */
  label: string;
};

/**
 * Hueco de un dato que no existe. El guion es lo que se ve; el texto `sr-only`
 * es lo que se oye, porque un lector de pantalla no puede distinguir "costo
 * desconocido" de "margen sin calcular" leyendo el mismo guion en dos columnas
 * distintas.
 */
export function UnknownValue({ label }: UnknownValueProps) {
  return (
    <span className="text-muted-foreground tabular-nums">
      —<span className="sr-only">{label}</span>
    </span>
  );
}
