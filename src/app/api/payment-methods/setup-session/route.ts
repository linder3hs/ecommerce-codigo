import { ConflictError, handleApiError } from "@/lib/api-error";
import { getCurrentAppUser, requireAuth } from "@/lib/auth";
import { APP_URL } from "@/lib/constants";
import { getStoreCurrency, getStripe } from "@/lib/stripe";
import { getOrCreateStripeCustomer } from "@/lib/stripe-customer";

// El espejo local de `users` puede ir un instante detrás de Clerk (webhook
// at-least-once). Es un 409 y no un 500: reintentar en unos segundos funciona.
const SYNCING_MESSAGE =
  "Tu cuenta se está sincronizando. Volvé a intentar en unos segundos.";

const RETURN_PATH = "/profile?tab=payment-methods";

/**
 * Alta de tarjeta. `mode: "setup"` no cobra nada: Stripe pide los datos, los
 * guarda contra el Customer y devuelve un SetupIntent. La fila local la escribe
 * el webhook, no este handler, porque quien vuelve puede cerrar la pestaña
 * antes de llegar a `success_url`.
 *
 * Sin body: qué tarjeta se guarda lo decide la persona en la página de Stripe,
 * no el cliente. Por eso no hay nada que validar con Zod.
 */
export async function POST() {
  try {
    // 401 si no hay sesión de Clerk; el espejo local se resuelve después.
    await requireAuth();

    const user = await getCurrentAppUser();

    if (!user) {
      throw new ConflictError(SYNCING_MESSAGE);
    }

    const customer = await getOrCreateStripeCustomer(user);

    const session = await getStripe().checkout.sessions.create({
      mode: "setup",
      customer,
      success_url: `${APP_URL}${RETURN_PATH}&setup=success`,
      cancel_url: `${APP_URL}${RETURN_PATH}`,
      // El webhook necesita saber de quién es la tarjeta y llega sin sesión:
      // el `appUserId` viaja firmado en el evento y le ahorra resolver el
      // Customer contra la base.
      metadata: { appUserId: user.id },
      // Sin `payment_method_types`: omitirlo habilita los métodos dinámicos que
      // se administran desde el Dashboard. A cambio, Stripe exige `currency` en
      // `mode: "setup"` para saber qué métodos ofrecer —no cobra nada acá—, y
      // omitirla es el "Missing required param: currency" del alta de tarjeta.
      currency: getStoreCurrency(),
    });

    if (!session.url) {
      throw new Error("Stripe no devolvió una URL de Checkout.");
    }

    return Response.json(
      { url: session.url },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    return handleApiError(error);
  }
}
