import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { registerForPushNotificationsAsync } from "@/lib/notifications";

/**
 * Configuration du comportement des notifications reçues au premier plan (Vendeur)
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Hook pour initialiser, demander la permission et écouter les notifications push Expo (Vendeur)
 * Écoute automatiquement les sessions Supabase pour sauvegarder le token vendeur dès connexion.
 */
export function usePushNotifications(initialUserId?: string | null) {
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    let currentToken: string | null = null;

    async function registerToken() {
      if (!Device.isDevice) {
        console.log("Les notifications push requièrent un appareil physique.");
        return;
      }

      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          console.warn("Permission de notification non accordée.");
          return;
        }

        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId ??
          "f4554dff-554d-449c-af1c-5091e1669423";

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = tokenData.data;
        currentToken = token;
        setExpoPushToken(token);

        const { data: { session } } = await supabase.auth.getSession();
        const activeUserId = initialUserId || session?.user?.id;
        if (activeUserId && token) {
          await registerForPushNotificationsAsync(activeUserId, token);
        }
      } catch (e) {
        console.warn("Erreur lors de la récupération de l'Expo Push Token vendeur:", e);
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Kalagban Vendeur",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#16a34a",
          sound: "default",
          enableVibrate: true,
          showBadge: true,
        });
      }
    }

    registerToken();

    const { data: authSub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.id && currentToken) {
        await registerForPushNotificationsAsync(session.user.id, currentToken);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((notif) => {
      setNotification(notif);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response.notification.request.content.data;
        if (data?.orderId || data?.order_id || data?.reference_id) {
          const orderId = data.orderId || data.order_id || data.reference_id;
          router.push(`/orders/${orderId}` as any);
        } else if (data?.productId || data?.product_id) {
          const productId = data.productId || data.product_id;
          router.push(`/products/${productId}` as any);
        } else if (data?.url) {
          router.push(data.url as any);
        }
      } catch (err) {
        console.warn("Erreur de navigation sur notification vendeur:", err);
      }
    });

    return () => {
      authSub?.subscription?.unsubscribe();
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [initialUserId]);

  return { expoPushToken, notification };
}
