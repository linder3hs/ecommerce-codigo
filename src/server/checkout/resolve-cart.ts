import "server-only";

import { ConflictError } from "@/lib/api-error";
import { isAllowedImageUrl } from "@/lib/image-hosts";
import { getStoreCurrency } from "@/lib/stripe";
import { productRepository } from "@/server/repositories/product.repository";

import type { CheckoutSessionInput } from "@/modules/checkout/schemas/checkout.schema";
import type { CreateOrderItemData } from "@/server/repositories/order.repository";
import type { PublicProductRow } from "@/server/repositories/product.repository";
import type Stripe from "stripe";

export type ResolvedCart = {
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  orderItems: CreateOrderItemData[];
  totalCents: number;
  currency: string;
};

function buildLineItem(
  product: PublicProductRow,
  qty: number,
  currency: string,
): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    quantity: qty,
    price_data: {
      currency,
      // El importe sale de la fila del producto, nunca del body: `priceCents` ya
      // es un entero de centavos, la unidad que espera `unit_amount`.
      unit_amount: product.priceCents,
      product_data: {
        name: product.name,
        // Stripe solo acepta URLs https públicas; una ruta relativa o un host
        // fuera de la allowlist rompería la creación de la sesión entera.
        ...(product.imageUrl && isAllowedImageUrl(product.imageUrl)
          ? { images: [product.imageUrl] }
          : {}),
      },
    },
  };
}

/**
 * Traduce lo que el navegador dice que quiere comprar a lo que de verdad se va
 * a cobrar. El body solo aporta `productId` y `qty`: precio, stock y
 * disponibilidad se releen de Neon acá, así que un carrito manipulado en el
 * navegador no puede cambiar el importe.
 *
 * Vive fuera de los handlers porque los dos caminos de pago —Checkout Session
 * hosteada y PaymentIntent con tarjeta guardada— tienen que rechazar y cobrar
 * exactamente lo mismo. Duplicar estas validaciones sería duplicar la regla de
 * negocio que protege el precio.
 *
 * Lanza `ConflictError` (409) y no 400: reintentar el mismo body más tarde,
 * cuando haya stock, puede funcionar.
 */
export async function resolveCartForPayment(
  items: CheckoutSessionInput["items"],
): Promise<ResolvedCart> {
  const products = await productRepository.findManyActiveByIds(
    items.map((item) => item.productId),
  );
  const byId = new Map(products.map((product) => [product.id, product]));

  const currency = getStoreCurrency();
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const orderItems: CreateOrderItemData[] = [];
  let totalCents = 0;

  for (const item of items) {
    const product = byId.get(item.productId);

    // Inexistente, despublicado, borrado o con la categoría despublicada: los
    // cuatro casos son el mismo para quien compra, el producto ya no está.
    if (!product) {
      throw new ConflictError(
        "Uno de los productos del carrito ya no está disponible.",
      );
    }

    if (product.stock < item.qty) {
      throw new ConflictError(
        product.stock === 0
          ? `${product.name} se agotó.`
          : `${product.name} solo tiene ${product.stock} unidades disponibles.`,
      );
    }

    lineItems.push(buildLineItem(product, item.qty, currency));
    orderItems.push({
      productId: product.id,
      nameSnapshot: product.name,
      unitPriceCents: product.priceCents,
      qty: item.qty,
    });
    // Aritmética entera de punta a punta: los importes son centavos.
    totalCents += product.priceCents * item.qty;
  }

  return { lineItems, orderItems, totalCents, currency };
}
