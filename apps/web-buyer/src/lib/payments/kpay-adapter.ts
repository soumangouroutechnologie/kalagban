import { IPaymentGateway, PaymentInitRequest, PaymentInitResult, PaymentVerificationResult } from "./types";
import { initKPayPayment, getKPayPaymentStatus } from "@/lib/kpay";

export class KPayAdapter implements IPaymentGateway {
  readonly provider = "kpay" as const;

  async initializePayment(request: PaymentInitRequest): Promise<PaymentInitResult> {
    const kpayRes = await initKPayPayment({
      amount: request.amount,
      currency: request.currency || "XOF",
      externalId: `KB-${request.orderId}`,
      returnUrl: request.returnUrl,
      cancelUrl: request.cancelUrl || request.returnUrl,
      description: request.description || `Commande Kalagban #${request.orderId.slice(0, 8).toUpperCase()}`,
      customerName: request.customerName,
      customerEmail: request.customerEmail,
      customerPhone: request.customerPhone,
      metadata: {
        orderId: request.orderId,
        ...request.metadata,
      },
    });

    return {
      success: true,
      paymentId: kpayRes.id,
      reference: kpayRes.reference,
      gatewayUrl: kpayRes.gatewayUrl || "",
      status: kpayRes.status,
      provider: "kpay",
      rawResponse: kpayRes,
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentVerificationResult> {
    const details = await getKPayPaymentStatus(paymentId);
    return {
      id: details.id,
      reference: details.reference,
      status: details.status,
      amount: details.amount,
      currency: details.currency || "XOF",
      provider: "kpay",
      paidAt: details.completedAt,
      failureReason: details.failureReason,
      rawResponse: details,
    };
  }
}
