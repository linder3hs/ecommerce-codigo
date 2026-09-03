/**
 * Chrome del storefront. La clase `storefront` es la que trae los tokens del
 * módulo (radios de 28 px, `--brand`, sombras sin borde) sin tocar los de
 * shadcn, de los que depende el panel; `storefront-canvas` pinta el gradiente
 * de fondo, que por ser un `background` no puede salir de una utilidad `bg-*`.
 *
 * Sin header global: la nav del storefront es una isla cliente propia.
 */
export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="storefront storefront-canvas flex min-h-dvh flex-1 flex-col">
      {children}
    </div>
  );
}
