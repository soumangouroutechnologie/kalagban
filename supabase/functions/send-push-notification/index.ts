import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Déclaration globale pour l'environnement d'exécution Deno Edge
declare const Deno: any;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req: Request) => {
  // CORS Headers pour autoriser les appels depuis les applications Web et mobiles
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    const payload = await req.json();
    const { userId, userIds, pushToken, title, body, data } = payload;

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing 'title' or 'body' in request payload" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    const tokensToSend: string[] = [];

    // 1. Si un token direct est fourni
    if (pushToken && typeof pushToken === "string" && pushToken.startsWith("ExponentPushToken[")) {
      tokensToSend.push(pushToken);
    }

    // 2. Si un ou plusieurs userId sont fournis, interroger la table profiles
    const targetUserIds = userIds || (userId ? [userId] : []);
    if (targetUserIds.length > 0 && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: profiles, error: dbError } = await supabaseAdmin
        .from("profiles")
        .select("id, expo_push_token")
        .in("id", targetUserIds);

      if (dbError) {
        console.warn("Erreur lors de la récupération des profils:", dbError.message);
      } else if (profiles) {
        for (const prof of profiles) {
          if (prof.expo_push_token && prof.expo_push_token.startsWith("ExponentPushToken[")) {
            tokensToSend.push(prof.expo_push_token);
          }
        }
      }
    }

    if (tokensToSend.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Aucun token Expo Push valide trouvé pour les destinataires ciblés.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 3. Préparer les messages pour l'API Expo Push
    const messages = tokensToSend.map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
      data: data || {},
      priority: "high",
      channelId: "default",
    }));

    console.log(`Envoi de ${messages.length} notification(s) Push Expo...`);

    // 4. Appel de l'API Expo Push
    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const expoResult = await expoResponse.json();
    console.log("Résultat Expo Push API :", JSON.stringify(expoResult));

    return new Response(
      JSON.stringify({
        success: true,
        sentCount: messages.length,
        expoResult,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Erreur dans send-push-notification Edge Function:", error);
    return new Response(JSON.stringify({ error: error?.message || "Internal Server Error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
