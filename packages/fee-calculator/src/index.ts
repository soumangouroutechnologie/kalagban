/**
 * Kalagban Marketplace - Official Application Fee Calculation Engine
 * 
 * Official Fee Tiers:
 * - 0 <= montant <= 10 000 FCFA   -> 4.75%
 * - 10 000 < montant <= 20 000 FCFA -> 3.00%
 * - 20 000 < montant <= 30 000 FCFA -> 2.00%
 * - 30 000 < montant <= 100 000 FCFA -> 1.50%
 * - montant > 100 000 FCFA        -> 0.99%
 * 
 * Rules:
 * 1. Base amount is the products subtotal (before application fee and without shipping fee).
 * 2. Financial rounding: Math.round() for integer FCFA currency.
 * 3. Client UI displays ONLY "Frais d'application" without showing percentage.
 */

export interface ApplicationFeeResult {
  /** The base amount (subtotal of products) */
  subtotal: number;
  /** The internal applied rate (e.g. 0.0475 for 4.75%) */
  rate: number;
  /** The application fee amount rounded to the nearest FCFA */
  applicationFee: number;
  /** Optional shipping fee */
  shippingFee: number;
  /** The total amount = subtotal + applicationFee + shippingFee */
  total: number;
}

/**
 * Calculates the exact application fee and total for a given order base amount.
 * 
 * @param amount Base order subtotal in FCFA
 * @param shippingFee Optional delivery fee in FCFA (default 0)
 * @returns ApplicationFeeResult containing subtotal, rate, applicationFee, shippingFee, total
 */
export function calculateApplicationFee(
  amount: number,
  shippingFee: number = 0
): ApplicationFeeResult {
  const cleanAmount = Math.max(0, Number(amount) || 0);
  const cleanShipping = Math.max(0, Number(shippingFee) || 0);

  if (cleanAmount === 0) {
    return {
      subtotal: 0,
      rate: 0,
      applicationFee: 0,
      shippingFee: cleanShipping,
      total: cleanShipping,
    };
  }

  let rate = 0;

  if (cleanAmount <= 10000) {
    rate = 0.0475; // 4.75%
  } else if (cleanAmount <= 20000) {
    rate = 0.03; // 3.00%
  } else if (cleanAmount <= 30000) {
    rate = 0.02; // 2.00%
  } else if (cleanAmount <= 100000) {
    rate = 0.015; // 1.50%
  } else {
    rate = 0.0099; // 0.99%
  }

  // Exact financial rounding for FCFA
  const applicationFee = Math.round(cleanAmount * rate);
  const total = cleanAmount + applicationFee + cleanShipping;

  return {
    subtotal: cleanAmount,
    rate,
    applicationFee,
    shippingFee: cleanShipping,
    total,
  };
}
