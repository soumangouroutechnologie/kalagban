import { NextResponse } from "next/server";
import { initKPayPayment } from "@/lib/kpay";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      orderId, 
      amount, 
      customerName, 
      customerEmail,
      customerPhone,
      redirectBaseUrl 
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

    // Call K-PAY to initialize the hosted gateway session
    const kpayResponse = await initKPayPayment({
      amount: Number(amount),
      currency: "XOF",
      externalId: `KB-${orderId}`,
      returnUrl,
      cancelUrl,
      description: `Commande Kalagban #${orderId.slice(0, 8).toUpperCase()}`,
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
      paymentId: kpayResponse.id,
      reference: kpayResponse.reference,
      gatewayUrl: kpayResponse.gatewayUrl,
      status: kpayResponse.status,
    });
  } catch (err: unknown) {
    console.error("Error in /api/payments/kpay/init:", err);
    const errorMessage = err instanceof Error ? err.message : "Erreur interne lors de l'initialisation du paiement";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
