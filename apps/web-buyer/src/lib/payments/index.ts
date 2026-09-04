import { IPaymentGateway, PaymentProvider } from "./types";
import { KPayAdapter } from "./kpay-adapter";
import { GeniusPayAdapter } from "./geniuspay-adapter";

export * from "./types";
export * from "./kpay-adapter";
export * from "./geniuspay-adapter";

/**
 * Factory retournant l'instance active du gestionnaire de paiement selon la configuration d'environnement.
 * Par défaut en phase de test : K-Pay.
 * En production : activable via NEXT_PUBLIC_PAYMENT_GATEWAY=geniuspay
 */
export function getPaymentGateway(provider?: PaymentProvider): IPaymentGateway {
  const selected = provider || (process.env.NEXT_PUBLIC_PAYMENT_GATEWAY as PaymentProvider) || "kpay";

  if (selected === "geniuspay") {
    return new GeniusPayAdapter();
  }

  return new KPayAdapter();
}
