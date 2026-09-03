import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "Identifiant de commande manquant." }, { status: 400 });
    }

    // Récupérer la commande avec shop et courier
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id,
        customer_name,
        customer_phone,
        customer_email,
        shipping_address,
        total_amount,
        subtotal,
        status,
        delivery_type,
        relay_status,
        pickup_code,
        delivery_otp,
        created_at,
        shop_id,
        shops (
          id,
          name,
          payout_phone
        ),
        order_items (
          id,
          quantity,
          unit_price,
          products (
            title
          )
        )
      `)
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    // Récupérer l'assignation coursier active si existante
    const { data: assignment } = await supabase
      .from("courier_assignments")
      .select(`
        id,
        status,
        assigned_at,
        delivered_at,
        notes,
        couriers (
          id,
          full_name,
          phone,
          vehicle_type,
          license_plate,
          preferred_zone
        )
      `)
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderCode: `KB-${order.id.slice(0, 8).toUpperCase()}`,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerEmail: order.customer_email,
        shippingAddress: order.shipping_address,
        totalAmount: order.total_amount,
        status: order.status,
        deliveryType: order.delivery_type,
        createdAt: order.created_at,
        shop: order.shops,
        items: order.order_items,
        assignment: assignment || null
      }
    });
  } catch (err: unknown) {
    console.error("Erreur API delivery/info:", err);
    return NextResponse.json({ error: "Erreur serveur interne." }, { status: 500 });
  }
}
