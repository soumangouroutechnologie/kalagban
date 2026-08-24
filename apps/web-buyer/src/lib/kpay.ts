export interface KPayInitOptions {
  amount: number;
  currency?: string;
  externalId: string;
  returnUrl: string;
  cancelUrl?: string;
  description?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  metadata?: Record<string, unknown>;
}

export interface KPayInitResponse {
  id: string;
  reference: string;
  externalId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  mode: "GATEWAY" | "USSD";
  amount: number;
  currency?: string;
  gatewayUrl?: string;
  expiresAt?: string;
  isTest?: boolean;
  message?: string;
}

export interface KPayPaymentDetails {
  id: string;
  reference: string;
  providerReference?: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  amount: number;
  netAmount?: number;
  feeAmount?: number;
  currency: string;
  externalId: string;
  provider?: string | null;
  country?: string | null;
  phoneNumber?: string;
  isTest?: boolean;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  completedAt?: string | null;
  failureReason?: string | null;
}

const KPAY_BASE_URL = process.env.KPAY_BASE_URL || "https://admin.kpay.site";
const KPAY_API_KEY = process.env.KPAY_API_KEY || "";
const KPAY_SECRET_KEY = process.env.KPAY_SECRET_KEY || "";

/**
 * Initialize a hosted checkout payment session with K-PAY
 */
export async function initKPayPayment(options: KPayInitOptions): Promise<KPayInitResponse> {
  if (!KPAY_API_KEY) {
    throw new Error("KPAY_API_KEY is not configured in environment variables.");
  }

  const payload: Record<string, unknown> = {
    amount: Math.round(options.amount),
    currency: options.currency || "XOF",
    externalId: options.externalId,
    returnUrl: options.returnUrl,
    cancelUrl: options.cancelUrl || options.returnUrl,
    description: options.description || `Commande Kalagban #${options.externalId}`,
  };

  const metadataObj: Record<string, unknown> = { ...(options.metadata || {}) };
  if (options.customerName) metadataObj.customerName = options.customerName;
  if (options.customerEmail) metadataObj.customerEmail = options.customerEmail;
  if (options.customerPhone) metadataObj.customerPhone = options.customerPhone;

  if (Object.keys(metadataObj).length > 0) {
    payload.metadata = metadataObj;
  }

  const res = await fetch(`${KPAY_BASE_URL}/api/v1/payments/init`, {
    method: "POST",
    headers: {
      "x-api-key": KPAY_API_KEY,
      "x-secret-key": KPAY_SECRET_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMsg = data?.message || data?.error || `K-PAY HTTP Error ${res.status}`;
    console.error("K-PAY init failed:", data);
    throw new Error(errorMsg);
  }

  return data as KPayInitResponse;
}

/**
 * Check payment status by transaction ID
 */
export async function getKPayPaymentStatus(paymentId: string): Promise<KPayPaymentDetails> {
  if (!KPAY_API_KEY) {
    throw new Error("KPAY_API_KEY is not configured.");
  }

  const res = await fetch(`${KPAY_BASE_URL}/api/v1/payments/${paymentId}`, {
    method: "GET",
    headers: {
      "x-api-key": KPAY_API_KEY,
      "x-secret-key": KPAY_SECRET_KEY,
    },
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || `Failed to fetch K-PAY payment status: ${res.status}`);
  }

  return data as KPayPaymentDetails;
}
