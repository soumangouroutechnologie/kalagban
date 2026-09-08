import { NextResponse } from "next/server";
import { supabase, supabaseAdmin } from "@/lib/supabase";

interface OrderRecord {
  id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  shipping_address?: string | null;
  total_amount?: number | null;
  status: string;
  delivery_type?: string | null;
  created_at: string;
  assigned_courier_id?: string | null;
}

interface OrderItemRecord {
  id: string;
  quantity: number;
  unit_price: number;
  product_id?: string | null;
}

interface ProductRecord {
  id: string;
  title: string;
}

interface CourierRecord {
  id: string;
  full_name: string;
  phone: string;
  vehicle_type: string;
  license_plate?: string | null;
  preferred_zone?: string | null;
}

interface DeliveryItem {
  id: string;
  quantity: number;
  unit_price: number;
  product_id?: string | null;
  products: {
    title: string;
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId")?.trim();

    if (!orderId) {
      return NextResponse.json({ error: "Identifiant de commande manquant." }, { status: 400 });
    }

    // 1. Tenter via la RPC sécurisée get_public_delivery_info (ne bloque jamais sur RLS)
    try {
      const { data: rpcData, error: rpcErr } = await supabase
        .rpc("get_public_delivery_info", { p_order_id: orderId });

      if (!rpcErr && rpcData && rpcData.success) {
        return NextResponse.json(rpcData);
      }
    } catch (rpcCatch) {
      console.warn("[delivery/info] Fallback direct query suite à RPC:", rpcCatch);
    }

    // 2. Fallback direct via supabaseAdmin / supabase
    const client = supabaseAdmin || supabase;
    let order: OrderRecord | null = null;

    // Essayer par UUID exact d'abord
    const { data: orderData, error: orderErr } = await client
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle<OrderRecord>();

    if (!orderErr && orderData) {
      order = orderData;
    } else {
      // Si l'ID est sous forme KB-XXXXX ou tronqué, chercher par correspondance
      const cleanId = orderId.replace(/^KB-/i, "");
      const { data: fallbackOrders } = await client
        .from("orders")
        .select("*")
        .ilike("id", `${cleanId}%`)
        .limit(1);

      if (fallbackOrders && fallbackOrders.length > 0) {
        order = fallbackOrders[0] as OrderRecord;
      }
    }

    if (!order) {
      console.warn(`[delivery/info] Commande introuvable pour ID: ${orderId}`);
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    // 3. Récupérer les articles
    let itemsData: DeliveryItem[] = [];
    const { data: items } = await client
      .from("order_items")
      .select("id, quantity, unit_price, product_id")
      .eq("order_id", order.id);

    if (items && items.length > 0) {
      const typedItems = items as OrderItemRecord[];
      const productIds = typedItems
        .map((i) => i.product_id)
        .filter((id): id is string => Boolean(id));
      const productsMap: Record<string, string> = {};

      if (productIds.length > 0) {
        const { data: prods } = await client
          .from("products")
          .select("id, title")
          .in("id", productIds);

        if (prods) {
          (prods as ProductRecord[]).forEach((p) => {
            productsMap[p.id] = p.title;
          });
        }
      }

      itemsData = typedItems.map((it) => ({
        ...it,
        products: {
          title: (it.product_id && productsMap[it.product_id]) || "Article"
        }
      }));
    }

    // 4. Récupérer l'assignation coursier
    const { data: assignment } = await client
      .from("courier_assignments")
      .select("id, status, assigned_at, delivered_at, notes, courier_id")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let courierData: CourierRecord | null = null;
    const courierIdToFind = assignment?.courier_id || order.assigned_courier_id;
    if (courierIdToFind) {
      const { data: courier } = await client
        .from("couriers")
        .select("id, full_name, phone, vehicle_type, license_plate, preferred_zone")
        .eq("id", courierIdToFind)
        .maybeSingle<CourierRecord>();
      courierData = courier;
    }

    // 5. Récupérer les informations de la boutique pour le retrait (Point A)
    const shopData = {
      name: "Boutique Partenaire KALAGBAN",
      address: "Adresse de retrait boutique",
      landmark: "",
      payout_phone: ""
    };

    const orderShopId = (order as unknown as { shop_id?: string }).shop_id;
    if (orderShopId) {
      const { data: s } = await client
        .from("shops")
        .select("name")
        .eq("id", orderShopId)
        .maybeSingle();
      if (s?.name) {
        shopData.name = s.name;
      }

      const { data: cert } = await client
        .from("seller_certifications")
        .select("store_address, location_description")
        .eq("shop_id", orderShopId)
        .maybeSingle();
      if (cert) {
        if (cert.store_address) shopData.address = cert.store_address;
        if (cert.location_description) shopData.landmark = cert.location_description;
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderCode: `KB-${order.id.slice(0, 8).toUpperCase()}`,
        customerName: order.customer_name || "Client",
        customerPhone: order.customer_phone || "",
        customerEmail: order.customer_email || "",
        shippingAddress: order.shipping_address || "Abidjan",
        totalAmount: order.total_amount || 0,
        status: order.status,
        deliveryType: order.delivery_type || "home_delivery",
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
