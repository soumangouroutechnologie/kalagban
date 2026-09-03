import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId")?.trim();

    if (!orderId) {
      return NextResponse.json({ error: "Identifiant de commande manquant." }, { status: 400 });
    }

    // 1. Récupérer la commande via supabaseAdmin (contourne les restrictions RLS)
    let order: any = null;

    // Essayer par UUID exact d'abord
    const { data: orderData, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (!orderErr && orderData) {
      order = orderData;
    } else {
      // Si l'ID est sous forme KB-XXXXX ou tronqué, chercher par correspondance
      const cleanId = orderId.replace(/^KB-/i, "");
      const { data: fallbackOrders } = await supabaseAdmin
        .from("orders")
        .select("*")
        .ilike("id", `${cleanId}%`)
        .limit(1);

      if (fallbackOrders && fallbackOrders.length > 0) {
        order = fallbackOrders[0];
      }
    }

    if (!order) {
      console.warn(`[delivery/info] Commande introuvable pour ID: ${orderId}`);
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    // 2. Récupérer la boutique
    let shopData = null;
    if (order.shop_id) {
      const { data: shop } = await supabaseAdmin
        .from("shops")
        .select("id, name, payout_phone")
        .eq("id", order.shop_id)
        .maybeSingle();
      shopData = shop;
    }

    // 3. Récupérer les articles
    let itemsData: any[] = [];
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("id, quantity, unit_price, product_id")
      .eq("order_id", order.id);

    if (items && items.length > 0) {
      const productIds = items.map((i: any) => i.product_id).filter(Boolean);
      const productsMap: Record<string, string> = {};

      if (productIds.length > 0) {
        const { data: prods } = await supabaseAdmin
          .from("products")
          .select("id, title")
          .in("id", productIds);

        if (prods) {
          prods.forEach((p: any) => {
            productsMap[p.id] = p.title;
          });
        }
      }

      itemsData = items.map((it: any) => ({
        ...it,
        products: {
          title: productsMap[it.product_id] || "Article"
        }
      }));
    }

    // 4. Récupérer l'assignation coursier
    const { data: assignment } = await supabaseAdmin
      .from("courier_assignments")
      .select("id, status, assigned_at, delivered_at, notes, courier_id")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let courierData = null;
    const courierIdToFind = assignment?.courier_id || order.assigned_courier_id;
    if (courierIdToFind) {
      const { data: courier } = await supabaseAdmin
        .from("couriers")
        .select("id, full_name, phone, vehicle_type, license_plate, preferred_zone")
        .eq("id", courierIdToFind)
        .maybeSingle();
      courierData = courier;
    }

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
        shop: shopData,
        items: itemsData,
        assignment: assignment
          ? {
              ...assignment,
              couriers: courierData
            }
          : courierData
          ? {
              id: null,
              status: order.status,
              couriers: courierData
            }
          : null
      }
    });
  } catch (err: unknown) {
    console.error("Erreur API delivery/info:", err);
    return NextResponse.json({ error: "Erreur serveur interne." }, { status: 500 });
  }
}

