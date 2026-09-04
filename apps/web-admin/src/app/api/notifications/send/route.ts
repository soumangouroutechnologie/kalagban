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
      sent_by = "Admin Kalagban",
      sent_by_role = "admin",
    } = body;

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "Le titre et le message sont requis." },
        { status: 400 }
      );
    }

    // 1. Récupérer les profils ciblés
    let profilesQuery = supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone, role, expo_push_token");

    if (target_type === "all_buyers") {
      profilesQuery = profilesQuery.or("role.eq.buyer,role.is.null");
    } else if (target_type === "all_sellers") {
      profilesQuery = profilesQuery.eq("role", "seller");
    } else if (target_type === "specific_buyer" || target_type === "specific_seller") {
      if (!target_id) {
        return NextResponse.json(
          { error: "L'identifiant du destinataire est requis." },
          { status: 400 }
        );
      }
      profilesQuery = profilesQuery.eq("id", target_id);
    }

    const { data: profiles, error: fetchErr } = await profilesQuery;

    if (fetchErr) {
      console.error("[Notifications API] Erreur récupération profils:", fetchErr);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des destinataires." },
        { status: 500 }
      );
    }

    const recipientList = profiles || [];
    const validPushTokens: { token: string; userId: string; role: string }[] = [];
    const buyerNotificationsToInsert: any[] = [];
    const sellerNotificationsToInsert: any[] = [];

    for (const p of recipientList) {
      const notifItem = {
        title: title.trim(),
        message: message.trim(),
        type: notification_type,
        reference_id: `campaign_${Date.now()}`,
        data: {
          url: url_redirect || null,
          campaign: true,
          sent_by,
        },
        is_read: false,
        created_at: new Date().toISOString(),
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

    // 2. Insertion in-app par lots
    if (buyerNotificationsToInsert.length > 0) {
      await supabaseAdmin.from("customer_notifications").insert(buyerNotificationsToInsert);
    }
    if (sellerNotificationsToInsert.length > 0) {
      await supabaseAdmin.from("seller_notifications").insert(sellerNotificationsToInsert);
    }

    // 3. Envoi via l'API Expo Push par lots de 100
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
          type: notification_type,
          title: title.trim(),
          message: message.trim(),
          sentAt: new Date().toISOString(),
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
        target_name: target_name || (target_type === "all" ? "Tous les utilisateurs" : target_type === "all_buyers" ? "Tous les clients" : "Tous les vendeurs"),
        sent_by,
        sent_by_role,
        notification_type,
        url_redirect: url_redirect || null,
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
  } catch (error: any) {
    console.error("[Notifications API] Erreur interne:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur interne lors de l'envoi de la notification." },
      { status: 500 }
    );
  }
}
