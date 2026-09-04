import { NextRequest, NextResponse } from "next/server";
import { 
  generateShippedEmailHtml, 
  generateReadyForPickupEmailHtml, 
  generateOrderConfirmationEmailHtml 
} from "@/lib/email-templates";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      type, 
      recipientEmail, 
      recipientName, 
      orderCode, 
      pickupCode, 
      relayName, 
      relayAddress, 
      relayCommune, 
      shopName, 
      deliveryType,
      trackingUrl,
      items,
      subtotal,
      applicationFee,
      shippingFee,
      totalAmount,
      shippingAddress,
      paymentMethod,
    } = body;

    if (!type || (!orderCode && !body.orderId)) {
      return NextResponse.json(
        { success: false, error: "Type and orderCode are required." },
        { status: 400 }
      );
    }

    const cleanOrderCode = orderCode || (body.orderId ? body.orderId.slice(0, 8).toUpperCase() : "CMD");
    const cleanCustomerName = recipientName || "Client Kalagban";

    let subject = "";
    let htmlContent = "";

    if (type === "ORDER_CONFIRMATION") {
      subject = `🎉 Confirmation de votre commande #${cleanOrderCode} - Kalagban`;
      htmlContent = generateOrderConfirmationEmailHtml({
        orderCode: cleanOrderCode,
        customerName: cleanCustomerName,
        items: items || [],
        subtotal: subtotal || 0,
        applicationFee: applicationFee || 0,
        shippingFee: shippingFee || 0,
        totalAmount: totalAmount || 0,
        deliveryType: deliveryType || "Point Relais",
        shippingAddress: shippingAddress || "Abidjan",
        paymentMethod: paymentMethod || "Paiement à la livraison",
        trackingUrl: trackingUrl || "https://kalagban.com/account",
      });
    } else if (type === "SHIPPED") {
      subject = `🚚 Votre commande #${cleanOrderCode} est en cours d'expédition`;
      htmlContent = generateShippedEmailHtml({
        orderCode: cleanOrderCode,
        customerName: cleanCustomerName,
        shopName: shopName || "Boutique Kalagban",
        deliveryType: deliveryType || "Point Relais",
        trackingUrl: trackingUrl || "https://kalagban.com/account",
      });
    } else if (type === "READY_FOR_PICKUP") {
      subject = `📍 Votre colis #${cleanOrderCode} est prêt au Point Relais (Code OTP : ${pickupCode || "------"})`;
      htmlContent = generateReadyForPickupEmailHtml({
        orderCode: cleanOrderCode,
        customerName: cleanCustomerName,
        pickupCode: pickupCode || "------",
        relayName: relayName || "Point Relais Kalagban",
        relayAddress: relayAddress || "Abidjan",
        relayCommune: relayCommune || "",
        trackingUrl: trackingUrl || "https://kalagban.com/account",
      });
    } else {
      return NextResponse.json(
        { success: false, error: `Unsupported email notification type: ${type}` },
        { status: 400 }
      );
    }

    // Provider check (Resend API Key with verified kalagban.com domain)
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Kalagban <notifications@kalagban.com>";
    let providerResponse = null;

    if (resendApiKey && recipientEmail) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: recipientEmail,
            subject,
            html: htmlContent,
          }),
        });

        providerResponse = await res.json();
      } catch (sendErr) {
        console.error("Resend API dispatch error:", sendErr);
      }
    } else {
      console.log(`[EMAIL DISPATCH SIMULATION] Type: ${type} | To: ${recipientEmail || cleanCustomerName} | Subject: ${subject}`);
    }

    return NextResponse.json({
      success: true,
      message: `Notification email ${type} dispatched successfully.`,
      recipient: recipientEmail || cleanCustomerName,
      subject,
      providerResponse,
    });
  } catch (error: unknown) {
    console.error("Error in email notification API:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
