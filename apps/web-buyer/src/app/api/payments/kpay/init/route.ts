import { NextResponse } from "next/server";
import { getPaymentGateway } from "@/lib/payments";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      orderId, 
      amount, 
      customerName, 
      customerEmail, 
      customerPhone, 
      redirectBaseUrl,
      provider 
    } = body;

    if (!orderId || !amount) {
      return NextResponse.json(
        { error: "orderId and amount are required." },
        { status: 400 }
      );
    }

    // Determine the base URL for redirection
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const origin = redirectBaseUrl || (host ? `${proto}://${host}` : "https://www.kalagban.com");

    const returnUrl = `${origin}/checkout/success?order_id=${encodeURIComponent(orderId)}`;
    const cancelUrl = `${origin}/checkout/cancel?order_id=${encodeURIComponent(orderId)}`;

    const gateway = getPaymentGateway(provider || "kpay");
    const initResult = await gateway.initializePayment({
      orderId,
      amount: Number(amount),
      currency: "XOF",
      returnUrl,
      cancelUrl,
      customerName: customerName || undefined,
      customerEmail: customerEmail || undefined,
      customerPhone: customerPhone || undefined,
      metadata: {
        orderId,
        customerPhone,
        platform: "kalagban_web_buyer",
      },
    });

    return NextResponse.json({
      success: true,
      paymentId: initResult.paymentId,
      reference: initResult.reference,
      gatewayUrl: initResult.gatewayUrl,
      status: initResult.status,
      provider: initResult.provider,
    });
  } catch (err: unknown) {
    console.error("Error in payment init route:", err);
    const errorMessage = err instanceof Error ? err.message : "Erreur interne lors de l'initialisation du paiement";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
