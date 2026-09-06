import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from '../context/auth-context';
import { usePushNotifications } from '../lib/usePushNotifications';
import { supabase } from '../lib/supabase';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppNavigation() {
  const { user } = useAuth();
  
  // Initialisation et écoute des notifications push pour le vendeur connecté
  usePushNotifications(user?.id);

  useEffect(() => {
    let notifSub: any;
    async function startSellerNotifListener() {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = user?.id || session?.user?.id;

      notifSub = supabase
        .channel('global_seller_alerts_' + Math.random().toString(36).substring(7))
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'seller_notifications' },
          async (payload) => {
            const newNotif = payload.new as any;
            if (!newNotif) return;

            // Vérifier si la notification concerne ce vendeur ou est broadcast
            if (!newNotif.seller_id || (currentUserId && newNotif.seller_id === currentUserId)) {
              try {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: newNotif.title || 'Kalagban Vendeur',
                    body: newNotif.message || '',
                    sound: 'default',
                    badge: 1,
                    data: {
                      orderId: newNotif.order_id || newNotif.reference_id,
                      productId: newNotif.product_id,
                      url: newNotif.data?.url,
                      image: newNotif.image_url || newNotif.data?.image,
                    },
                  },
                  trigger: null,
                });
              } catch (e) {
                console.warn('Erreur affichage notification vendeur:', e);
              }
            }
          }
        )
        .subscribe();
    }

    startSellerNotifListener();

    return () => {
      if (notifSub) supabase.removeChannel(notifSub);
    };
  }, [user?.id]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F8FAFC' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="splash" />
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen 
        name="product-editor" 
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppNavigation />
    </AuthProvider>
  );
}
