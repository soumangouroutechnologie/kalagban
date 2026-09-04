export type PaymentProvider = "kpay" | "geniuspay" | "cod";

export interface PaymentInitRequest {
  orderId: string;
  amount: number;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  returnUrl: string;
  cancelUrl?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentInitResult {
  success: boolean;
  paymentId: string;
  reference: string;
  gatewayUrl: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  provider: PaymentProvider;
  rawResponse?: unknown;
}

export interface PaymentVerificationResult {
  id: string;
  reference: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
  amount: number;
  currency: string;
  provider: PaymentProvider;
  paidAt?: string | null;
  failureReason?: string | null;
  rawResponse?: unknown;
}

export interface IPaymentGateway {
  readonly provider: PaymentProvider;
  initializePayment(request: PaymentInitRequest): Promise<PaymentInitResult>;
  verifyPayment(paymentId: string): Promise<PaymentVerificationResult>;
}
