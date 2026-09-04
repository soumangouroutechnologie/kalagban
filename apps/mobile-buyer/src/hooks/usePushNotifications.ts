import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { registerForPushNotificationsAsync } from "@/lib/notifications";

/**
 * Configuration du comportement des notifications reçues au premier plan
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
 * Hook pour initialiser, demander la permission et écouter les notifications push Expo (Acheteur)
 */
export function usePushNotifications(userId?: string | null) {
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
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
          "0c107dca-a4d2-44d2-8930-288d6a9872f0";

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = tokenData.data;
        setExpoPushToken(token);

        if (userId && token) {
          await registerForPushNotificationsAsync(userId, token);
        }
      } catch (e) {
        console.warn("Erreur lors de la récupération de l'Expo Push Token:", e);
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Kalagban Notifications",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#16a34a",
        });
      }
    }

    registerToken();

    notificationListener.current = Notifications.addNotificationReceivedListener((notif) => {
      setNotification(notif);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response.notification.request.content.data;
        if (data?.orderId || data?.order_id) {
          const targetOrderId = data.orderId || data.order_id;
          router.push(`/orders/${targetOrderId}` as any);
        } else if (data?.productId || data?.product_id) {
          const targetProductId = data.productId || data.product_id;
          router.push(`/product/${targetProductId}` as any);
        } else if (data?.url) {
          router.push(data.url as any);
        }
      } catch (err) {
        console.warn("Erreur de navigation sur notification:", err);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [userId]);

  return { expoPushToken, notification };
}
