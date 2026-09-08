import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { checkRateLimit, rateLimitResponse } from "@/lib/ratelimit";

export async function POST(req: Request) {
  // Rate limit : max 10 vérifications OTP par minute par IP pour bloquer le brute-force
  const rateLimit = await checkRateLimit(req, {
    limit: 10,
    windowSeconds: 60,
    prefix: "delivery_verify_otp",
  });

  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit, "Trop de tentatives de vérification OTP. Veuillez patienter une minute.");
  }

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

    // 1. Tenter via la RPC sécurisée verify_courier_delivery_otp
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc("verify_courier_delivery_otp", {
        p_order_id: orderId,
        p_otp: trimmedOtp,
        p_courier_id: courierId || null
      });

      if (!rpcErr && rpcData) {
        if (!rpcData.success) {
          return NextResponse.json({ error: rpcData.error || "Code OTP incorrect." }, { status: 400 });
        }
        return NextResponse.json(rpcData);
      }
    } catch (rpcCatch) {
      console.warn("[delivery/verify] Fallback direct query suite à RPC:", rpcCatch);
    }

    // 2. Fallback direct via supabaseAdmin / supabase
    const client = supabaseAdmin || supabase;
    const { data: order, error: orderErr } = await client
      .from("orders")
      .select("id, status, pickup_code, delivery_otp, customer_id, shop_id, customer_name, total_amount")
      .eq("id", orderId)
      .maybeSingle();

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
        { success: true, message: "Cette commande est déjà marquée comme livrée." },
        { status: 200 }
      );
    }

    // Vérification du code OTP
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

    // Mise à jour de la commande vers 'delivered'
    const { error: updateOrderErr } = await client
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

    // Mise à jour de l'assignation coursier
    try {
      await client
        .from("courier_assignments")
        .update({
          status: "delivered",
          delivered_at: now
        })
        .eq("order_id", orderId);

      if (courierId) {
        const { data: courier } = await client
          .from("couriers")
          .select("total_deliveries")
          .eq("id", courierId)
          .maybeSingle();

        if (courier) {
          await client
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

    return NextResponse.json({
      success: true,
      message: "Livraison validée avec succès !"
    });

  } catch (err: unknown) {
    console.error("Erreur API delivery/verify:", err);
    return NextResponse.json({ error: "Erreur serveur lors de la validation OTP." }, { status: 500 });
  }
}
