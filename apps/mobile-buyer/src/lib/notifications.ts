import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

/**
 * Enregistre le token Expo Push dans la table profiles de Supabase
 * pour permettre l'envoi de notifications push natives.
 */
export async function registerForPushNotificationsAsync(userId: string, expoPushToken: string): Promise<boolean> {
  if (!userId || !expoPushToken) return false;

  try {
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          expo_push_token: expoPushToken,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (error) {
      console.warn("Failed to register Expo push token:", error.message);
      return false;
    }

    console.log("Expo Push Token successfully registered for user:", userId, expoPushToken);
    return true;
  } catch (err) {
    console.error("Error registering push token:", err);
    return false;
  }
}

/**
 * Utilitaire pour envoyer une notification Push via l'API officielle Expo
 */
export async function sendExpoPushNotification(
  targetPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  if (!targetPushToken || !targetPushToken.startsWith("ExponentPushToken[")) {
    return false;
  }

  const message = {
    to: targetPushToken,
    sound: "default",
    title,
    body,
    data: data || {},
    priority: "high",
    channelId: "default",
  };

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await res.json();
    return result?.data?.status === "ok";
  } catch (err) {
    console.error("Failed to send Expo Push notification:", err);
    return false;
  }
}
