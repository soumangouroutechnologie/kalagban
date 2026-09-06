import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ddqwnscrmzwnciinehtf.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      message,
      target_type = "all",
      target_id,
      target_name,
      notification_type = "info",
      url_redirect,
      image_url,
      sent_by = "Admin Kalagban",
      sent_by_role = "admin",
    } = body;

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Le titre et le message sont obligatoires." },
        { status: 400 }
      );
    }

    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    const nowIso = new Date().toISOString();

    // 1. Récupération robuste des profils et des boutiques
    const [profilesRes, shopsRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, full_name, phone, role, expo_push_token"),
      supabaseAdmin
        .from("shops")
        .select("id, name, owner_id"),
    ]);

    if (profilesRes.error) {
      console.error("[Notifications API] Erreur lecture profils:", profilesRes.error);
      return NextResponse.json(
        { error: `Erreur base de données : ${profilesRes.error.message}` },
        { status: 500 }
      );
    }

    const allProfiles = profilesRes.data || [];
    const allShops = shopsRes.data || [];

    // Map pour retrouver rapidement la boutique d'un vendeur
    const ownerToShopMap = new Map<string, string>();
    for (const shop of allShops) {
      if (shop.owner_id) {
        ownerToShopMap.set(shop.owner_id, shop.id);
      }
    }

    // 2. Filtrage des destinataires selon la cible
    let recipientList = [...allProfiles];

    if (target_type === "all_buyers") {
      recipientList = recipientList.filter(
        (p) => p.role !== "seller" && p.role !== "admin" && p.role !== "superadmin" && p.role !== "courier"
      );
    } else if (target_type === "all_sellers") {
      recipientList = recipientList.filter(
        (p) => p.role === "seller" || ownerToShopMap.has(p.id)
      );
    } else if (target_type === "all_admins") {
      recipientList = recipientList.filter(
        (p) => p.role === "admin" || p.role === "superadmin"
      );
    } else if (target_type === "specific_buyer" || target_type === "specific_seller") {
      if (!target_id) {
        return NextResponse.json(
          { error: "Veuillez sélectionner un destinataire spécifique." },
          { status: 400 }
        );
      }
      recipientList = recipientList.filter((p) => p.id === target_id);
    }

    // 3. Préparation des structures d'insertion in-app et push
    const validPushTokens: { token: string; userId: string; role: string }[] = [];
    const buyerNotifsToInsert: Record<string, unknown>[] = [];
    const sellerNotifsToInsert: Record<string, unknown>[] = [];
    const adminNotifsToInsert: Record<string, unknown>[] = [];

    // Normalisation sécurisée du type pour compatibilité totale
    const safeDbType = ["order", "delivery", "pickup", "system", "promo"].includes(notification_type)
      ? notification_type
      : notification_type === "support"
      ? "system"
      : "info";

    for (const p of recipientList) {
      const isSeller = p.role === "seller" || ownerToShopMap.has(p.id);
      const isAdmin = p.role === "admin" || p.role === "superadmin";

      const commonData = {
        url: url_redirect || null,
        image: image_url || null,
        campaign: true,
        sent_by,
        sent_by_role,
        notification_type,
        category: notification_type,
      };

      if (isSeller) {
        const shopId = ownerToShopMap.get(p.id) || null;
        sellerNotifsToInsert.push({
          seller_id: p.id,
          shop_id: shopId,
          title: cleanTitle,
          message: cleanMessage,
          type: safeDbType,
          reference_id: `notif_${Date.now()}_${p.id.substring(0, 6)}`,
          image_url: image_url || null,
          data: commonData,
          is_read: false,
          created_at: nowIso,
          updated_at: nowIso,
        });
      } else if (isAdmin) {
        adminNotifsToInsert.push({
          title: cleanTitle,
          message: cleanMessage,
          notification_type: safeDbType,
          target_role: "admin",
          is_broadcast: target_type === "all" || target_type === "all_admins",
          is_read: false,
          image_url: image_url || null,
          data: commonData,
          created_at: nowIso,
        });
      } else {
        buyerNotifsToInsert.push({
          customer_id: p.id,
          title: cleanTitle,
          message: cleanMessage,
          type: safeDbType,
          reference_id: `notif_${Date.now()}_${p.id.substring(0, 6)}`,
          image_url: image_url || null,
          data: commonData,
          is_read: false,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }

      // Collecte du token Expo Push
      if (p.expo_push_token && p.expo_push_token.startsWith("ExponentPushToken[")) {
        validPushTokens.push({
          token: p.expo_push_token,
          userId: p.id,
          role: p.role || "buyer",
        });
      }
    }

    // 4. Exécution parallèle des insertions in-app
    await Promise.allSettled([
      buyerNotifsToInsert.length > 0
        ? supabaseAdmin.from("customer_notifications").insert(buyerNotifsToInsert)
        : Promise.resolve(),
      sellerNotifsToInsert.length > 0
        ? supabaseAdmin.from("seller_notifications").insert(sellerNotifsToInsert)
        : Promise.resolve(),
      adminNotifsToInsert.length > 0
        ? supabaseAdmin.from("admin_notifications").insert(adminNotifsToInsert)
        : Promise.resolve(),
    ]);

    // 5. Envoi des Push Notifications Natives via Expo API
    let deliveredCount = 0;
    let failedCount = 0;

    if (validPushTokens.length > 0) {
      const messages = validPushTokens.map((item) => ({
        to: item.token,
        sound: "default",
        title: cleanTitle,
        body: cleanMessage,
        priority: "high",
        channelId: "default",
        data: {
          url: url_redirect || null,
          image: image_url || null,
          type: notification_type,
          notification_type,
          title: cleanTitle,
          message: cleanMessage,
          sentAt: nowIso,
        },
      }));

      const chunkSize = 100;
      for (let i = 0; i < messages.length; i += chunkSize) {
        const chunk = messages.slice(i, i + chunkSize);
        try {
          const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Accept-encoding": "gzip, deflate",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(chunk),
          });

          const result = await expoRes.json();
          if (result && Array.isArray(result.data)) {
            for (const ticket of result.data) {
              if (ticket.status === "ok") {
                deliveredCount++;
              } else {
                failedCount++;
              }
            }
          }
        } catch (pushErr) {
          console.error("[Notifications API] Erreur envoi lot Expo:", pushErr);
          failedCount += chunk.length;
        }
      }
    }

    // 6. Enregistrement dans l'historique push_campaigns
    const targetDisplay =
      target_name ||
      (target_type === "all"
        ? "Tous les utilisateurs"
        : target_type === "all_buyers"
        ? "Tous les clients"
        : target_type === "all_sellers"
        ? "Tous les vendeurs"
        : target_type === "all_admins"
        ? "Tous les administrateurs"
        : "Cible spécifique");

    const { data: campaign } = await supabaseAdmin
      .from("push_campaigns")
      .insert({
        title: cleanTitle,
        message: cleanMessage,
        target_type,
        target_id: target_id || null,
        target_name: targetDisplay,
        sent_by,
        sent_by_role,
        notification_type,
        url_redirect: url_redirect || null,
        image_url: image_url || null,
        recipients_count: recipientList.length,
        delivered_count: deliveredCount,
        failed_count: failedCount,
        status: deliveredCount > 0 || recipientList.length === 0 ? "sent" : "failed",
      })
      .select()
      .maybeSingle();

    return NextResponse.json({
      success: true,
      recipients_total: recipientList.length,
      push_tokens_found: validPushTokens.length,
      delivered_count: deliveredCount,
      failed_count: failedCount,
      campaign: campaign || null,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Erreur interne serveur";
    console.error("[Notifications API] Erreur interne:", error);
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
