/**
 * Phase de test : seuls les paiements en espèces (à la livraison / au retrait) sont acceptés.
 *
 * Activé par défaut. Pour réactiver le paiement en ligne (K-PAY / Mobile Money),
 * définir NEXT_PUBLIC_CASH_ONLY_PAYMENTS=false dans les variables d'environnement
 * (Vercel) puis redéployer.
 */
export const CASH_ONLY_PAYMENTS = process.env.NEXT_PUBLIC_CASH_ONLY_PAYMENTS !== "false";

export const CASH_ONLY_MESSAGE =
  "Pendant la phase de test, seul le paiement en espèces à la réception du colis est accepté.";
