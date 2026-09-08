import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { orderId, courierId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Identifiant de commande manquant." }, { status: 400 });
    }

    // 1. Tenter via la RPC sécurisée confirm_courier_pickup
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc("confirm_courier_pickup", {
        p_order_id: orderId,
        p_courier_id: courierId || null
      });

      if (!rpcErr && rpcData) {
        if (!rpcData.success) {
          return NextResponse.json({ error: rpcData.error || "Erreur de validation." }, { status: 400 });
        }
        return NextResponse.json(rpcData);
      }
    } catch (rpcCatch) {
      console.warn("[delivery/pickup] Fallback direct query suite à RPC:", rpcCatch);
    }

    // 2. Fallback direct via supabaseAdmin / supabase
    const client = supabaseAdmin || supabase;
    const { data: order, error: orderErr } = await client
      .from("orders")
      .select("id, customer_id, shop_id, customer_name, status, pickup_code, delivery_otp")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    if (order.status === "cancelled") {
      return NextResponse.json({ error: "Cette commande a été annulée." }, { status: 400 });
    }

    if (order.status === "delivered") {
      return NextResponse.json({ error: "Cette commande a déjà été livrée." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const orderCode = `KB-${order.id.slice(0, 8).toUpperCase()}`;

    // Mettre à jour la commande à 'in_transit'
    await client
      .from("orders")
      .update({
        status: "in_transit",
        relay_status: "in_transit",
        updated_at: now
      })
      .eq("id", orderId);

    // Mettre à jour l'assignation du coursier
    await client
      .from("courier_assignments")
      .update({
        status: "in_transit",
        picked_up_at: now
      })
      .eq("order_id", orderId);

    // Récupérer les infos du coursier si dispo
    let courierName = "votre livreur dédié";
    if (courierId) {
      const { data: courier } = await client
        .from("couriers")
        .select("full_name")
        .eq("id", courierId)
        .maybeSingle();
      if (courier?.full_name) {
        courierName = courier.full_name;
      }
    }

    // Notifier le client
    if (order.customer_id) {
      await client.from("customer_notifications").insert({
        customer_id: order.customer_id,
        order_id: order.id,
        title: "Colis en Route vers votre Domicile 🛵",
        message: `Votre colis a été pris en charge par ${courierName}. Il fait actuellement route vers votre adresse de livraison !`,
        type: "order"
      });
    }

    // Notifier le vendeur
    if (order.shop_id) {
      await client.from("seller_notifications").insert({
        shop_id: order.shop_id,
        title: "Colis Remis au Livreur 📦",
        message: `Le coursier ${courierName} a pris en charge le colis de la commande #${orderCode}.`,
        type: "order",
        reference_id: order.id
      });
    }

    return NextResponse.json({
      success: true,
      message: "Prise en charge validée. Vous pouvez maintenant faire route vers le client !"
    });

  } catch (err: unknown) {
    console.error("Erreur API delivery/pickup:", err);
    return NextResponse.json({ error: "Erreur serveur lors de la prise en charge." }, { status: 500 });
  }
}
