/**
 * Kalagban Marketplace - Official Application Fee Engine
 */

export interface ApplicationFeeResult {
  subtotal: number;
  rate: number;
  applicationFee: number;
  shippingFee: number;
  total: number;
}

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
