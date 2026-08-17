import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log("🔔 [K-PAY Webhook Received]:", JSON.stringify(payload));

    const { id, reference, externalId, status, amount, metadata } = payload;

    // Extract order ID from externalId or metadata
    let orderId = metadata?.orderId;
    if (!orderId && externalId && externalId.startsWith("KB-")) {
      orderId = externalId.replace("KB-", "");
    }

    if (!orderId) {
      console.warn("⚠️ K-PAY Webhook: Order ID not found in payload", payload);
      return NextResponse.json({ received: true, message: "Order ID missing" });
    }

    if (status === "COMPLETED") {
      // 1. Update Order in Supabase
      const { error: updateErr } = await supabase
        .from("orders")
        .update({
          status: "processing", // Order is paid and enters processing
        })
        .eq("id", orderId);

      if (updateErr) {
        console.error("❌ Error updating order on K-PAY webhook:", updateErr);
      } else {
        console.log(`✅ Order #${orderId} marked as PAID via K-PAY (ref: ${reference || id})`);
      }

      // 2. Insert notification
      await supabase.from("admin_notifications").insert({
        title: "Paiement K-PAY Confirmé",
        message: `Paiement de ${amount} FCFA reçu avec succès pour la commande #${orderId.slice(0, 8).toUpperCase()}. Réf K-PAY: ${reference || id}.`,
        target_group: "finance",
        notification_type: "info",
        sent_by: "K-PAY Webhook",
        delivered_count: 1,
      });
    } else if (status === "FAILED") {
      console.warn(`⚠️ K-PAY Payment failed for order #${orderId}`);
    }

    return NextResponse.json({ received: true, status });
  } catch (err: unknown) {
    console.error("❌ Error handling K-PAY webhook:", err);
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
