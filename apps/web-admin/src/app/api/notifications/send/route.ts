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

    // 1. Récupération robuste des profils cibles
    const { data: allProfiles, error: fetchErr } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone, role, expo_push_token");

    if (fetchErr) {
      console.error("[Notifications API] Erreur récupération profils:", fetchErr);
      return NextResponse.json(
        { error: `Erreur base de données : ${fetchErr.message || "Impossible de lire les profils."}` },
        { status: 500 }
      );
    }

    let recipientList = allProfiles || [];

    // Filtrage propre et sécurisé en mémoire
    if (target_type === "all_buyers") {
      recipientList = recipientList.filter((p) => p.role !== "seller" && p.role !== "admin" && p.role !== "courier");
    } else if (target_type === "all_sellers") {
      recipientList = recipientList.filter((p) => p.role === "seller");
    } else if (target_type === "specific_buyer" || target_type === "specific_seller") {
      if (!target_id) {
        return NextResponse.json(
          { error: "Veuillez sélectionner un destinataire spécifique." },
          { status: 400 }
        );
      }
      recipientList = recipientList.filter((p) => p.id === target_id);
    }

    interface InAppNotification {
      title: string;
      message: string;
      type: string;
      reference_id: string;
      image_url: string | null;
      data: Record<string, unknown>;
      is_read: boolean;
      created_at: string;
      updated_at: string;
      customer_id?: string;
      seller_id?: string;
    }

    const validPushTokens: { token: string; userId: string; role: string }[] = [];
    const buyerNotificationsToInsert: InAppNotification[] = [];
    const sellerNotificationsToInsert: InAppNotification[] = [];

    const nowIso = new Date().toISOString();

    for (const p of recipientList) {
      const notifItem = {
        title: title.trim(),
        message: message.trim(),
        type: notification_type,
        reference_id: `campaign_${Date.now()}`,
        image_url: image_url || null,
        data: {
          url: url_redirect || null,
          image: image_url || null,
          campaign: true,
          sent_by,
        },
        is_read: false,
        created_at: nowIso,
        updated_at: nowIso,
      };

      if (p.role === "seller") {
        sellerNotificationsToInsert.push({
          ...notifItem,
          seller_id: p.id,
        });
      } else {
        buyerNotificationsToInsert.push({
          ...notifItem,
          customer_id: p.id,
        });
      }

      if (p.expo_push_token && p.expo_push_token.startsWith("ExponentPushToken[")) {
        validPushTokens.push({
          token: p.expo_push_token,
          userId: p.id,
          role: p.role || "buyer",
        });
      }
    }

    // 2. Insertion in-app dans les tables respectives
    if (buyerNotificationsToInsert.length > 0) {
      const { error: buyerInsertErr } = await supabaseAdmin
        .from("customer_notifications")
        .insert(buyerNotificationsToInsert);
      if (buyerInsertErr) {
        console.warn("[Notifications API] Avertissement insertion customer_notifications:", buyerInsertErr.message);
      }
    }

    if (sellerNotificationsToInsert.length > 0) {
      const { error: sellerInsertErr } = await supabaseAdmin
        .from("seller_notifications")
        .insert(sellerNotificationsToInsert);
      if (sellerInsertErr) {
        console.warn("[Notifications API] Avertissement insertion seller_notifications:", sellerInsertErr.message);
      }
    }

    // 3. Envoi via l'API officielle Expo Push par lots de 100
    let deliveredCount = 0;
    let failedCount = 0;

    if (validPushTokens.length > 0) {
      const messages = validPushTokens.map((item) => ({
        to: item.token,
        sound: "default",
        title: title.trim(),
        body: message.trim(),
        priority: "high",
        channelId: "default",
        data: {
          url: url_redirect || null,
          image: image_url || null,
          type: notification_type,
          title: title.trim(),
          message: message.trim(),
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
          if (result && result.data) {
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

    // 4. Enregistrement dans l'historique push_campaigns
    const { data: campaign } = await supabaseAdmin
      .from("push_campaigns")
      .insert({
        title: title.trim(),
        message: message.trim(),
        target_type,
        target_id: target_id || null,
        target_name: target_name || (
          target_type === "all" ? "Tous les utilisateurs" :
          target_type === "all_buyers" ? "Tous les clients" :
          target_type === "all_sellers" ? "Tous les vendeurs" :
          "Cible spécifique"
        ),
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
      .single();

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
