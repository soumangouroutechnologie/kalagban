import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, otp, courierId } = body;

    if (!orderId || !otp) {
      return NextResponse.json(
        { error: "Veuillez fournir l'identifiant de la commande et le code OTP." },
        { status: 400 }
      );
    }

    const trimmedOtp = String(otp).trim();

    // 1. Récupérer la commande
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, status, pickup_code, delivery_otp, customer_id, shop_id, customer_name, total_amount")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    if (order.status === "cancelled") {
      return NextResponse.json(
        { error: "Cette commande a été annulée. Impossible de valider la livraison." },
        { status: 400 }
      );
    }

    if (order.status === "delivered") {
      return NextResponse.json(
        { error: "Cette commande est déjà marquée comme livrée." },
        { status: 400 }
      );
    }

    // 2. Vérification du code OTP
    const validCodes = [
      String(order.pickup_code || "").trim(),
      String(order.delivery_otp || "").trim()
    ].filter(Boolean);

    const isMatch = validCodes.some((code) => code.toLowerCase() === trimmedOtp.toLowerCase());

    if (!isMatch) {
      return NextResponse.json(
        { error: "Code secret OTP incorrect. Veuillez demander au client de vérifier son écran de commande." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // 3. Mise à jour de la commande vers 'delivered'
    const { error: updateOrderErr } = await supabase
      .from("orders")
      .update({
        status: "delivered",
        relay_status: "picked_up",
        delivered_at: now
      })
      .eq("id", orderId);

    if (updateOrderErr) {
      console.error("Erreur mise à jour commande:", updateOrderErr);
      return NextResponse.json(
        { error: "Erreur lors de la validation de la livraison." },
        { status: 500 }
      );
    }

    // 4. Mise à jour de l'assignation coursier
    try {
      await supabase
        .from("courier_assignments")
        .update({
          status: "delivered",
          delivered_at: now
        })
        .eq("order_id", orderId);

      // Si un coursier est identifié, mettre à jour ses livraisons
      if (courierId) {
        const { data: courier } = await supabase
          .from("couriers")
          .select("total_deliveries")
          .eq("id", courierId)
          .single();

        if (courier) {
          await supabase
            .from("couriers")
            .update({
              total_deliveries: (courier.total_deliveries || 0) + 1,
              status: "available"
            })
            .eq("id", courierId);
        }
      }
    } catch (assignErr) {
      console.warn("Avertissement mise à jour coursier:", assignErr);
    }

    // 5. Notifications Temps Réel
    try {
      const orderShort = order.id.slice(0, 8).toUpperCase();

      // A. Client
      if (order.customer_id) {
        await supabase.from("customer_notifications").insert({
          customer_id: order.customer_id,
          order_id: order.id,
          title: "Colis Livré avec Succès ! 🎉",
          message: `Votre commande #${orderShort} a été remise en main propre. Merci d'avoir choisi Kalagban !`,
          type: "order"
        });
      }

      // B. Vendeur
      if (order.shop_id) {
        await supabase.from("seller_notifications").insert({
          shop_id: order.shop_id,
          title: "Commande Livrée au Client 📦",
          message: `La commande #${orderShort} a été remise au client. Vos gains sont débloqués.`,
          type: "order",
          reference_id: order.id
        });
      }

      // C. Admin
      await supabase.from("admin_notifications").insert({
        title: "Livraison à Domicile Effectuée",
        message: `La commande #${orderShort} (${order.customer_name}) a été livrée avec succès par le coursier.`,
        notification_type: "info",
        target_role: "all",
        is_broadcast: true
      });
    } catch (notifErr) {
      console.warn("Avertissement envoi notifications:", notifErr);
    }

    return NextResponse.json({
      success: true,
      message: "Livraison validée avec succès !"
    });
  } catch (err: unknown) {
    console.error("Erreur API delivery/verify:", err);
    return NextResponse.json({ error: "Erreur serveur interne." }, { status: 500 });
  }
}
