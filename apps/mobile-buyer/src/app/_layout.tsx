import React, { useState, useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreenNative from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useColorScheme } from 'react-native';
import { CartProvider } from '@/context/cart-context';
import { FavoritesProvider } from '@/context/favorites-context';
import SplashScreen from '@/components/SplashScreen';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { supabase } from '@/lib/supabase';

SplashScreenNative.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showSplash, setShowSplash] = useState(true);

  // Initialisation et écoute des notifications push natives Expo
  usePushNotifications();

  useEffect(() => {
    // Masquer immédiatement l'écran bleu natif d'Expo pour afficher notre splash animé Kalagban
    SplashScreenNative.hideAsync().catch(() => {});

    // Écouteur global Realtime : déclenche immédiatement la bannière système haute avec son & vibration
    let notifSub: any;
    async function startGlobalNotifListener() {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      notifSub = supabase
        .channel('global_buyer_alerts_' + Math.random().toString(36).substring(7))
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'customer_notifications' },
          async (payload) => {
            const newNotif = payload.new as any;
            if (!newNotif) return;

            // Vérifier si la notification concerne ce client ou est broadcast
            if (!newNotif.customer_id || (currentUserId && newNotif.customer_id === currentUserId)) {
              try {
                await Notifications.scheduleNotificationAsync({
                  content: {
                    title: newNotif.title || 'Kalagban',
                    body: newNotif.message || '',
                    sound: 'default',
                    badge: 1,
                    data: {
                      orderId: newNotif.order_id,
                      url: newNotif.data?.url || newNotif.url_redirect,
                      image: newNotif.image_url || newNotif.data?.image,
                    },
                  },
                  trigger: null,
                });
              } catch (e) {
                console.warn('Erreur affichage bannière push locale:', e);
              }
            }
          }
        )
        .subscribe();
    }

    startGlobalNotifListener();

    return () => {
      if (notifSub) supabase.removeChannel(notifSub);
    };
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <CartProvider>
      <FavoritesProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ title: 'Kalagban Marketplace' }} />
            <Stack.Screen name="splash" options={{ title: 'Écran de Démarrage' }} />
            <Stack.Screen name="explore" options={{ title: 'Boutiques' }} />
            <Stack.Screen name="favorites" options={{ title: 'Mes Favoris' }} />
            <Stack.Screen name="product/[id]" options={{ title: 'Détails Produit', presentation: 'card' }} />
            <Stack.Screen name="cart" options={{ title: 'Mon Panier', presentation: 'modal' }} />
            <Stack.Screen name="checkout" options={{ title: 'Checkout & Paiement' }} />
            <Stack.Screen name="profile" options={{ title: 'Mon Compte' }} />
            <Stack.Screen name="orders/index" options={{ title: 'Mes Commandes' }} />
            <Stack.Screen name="category/[id]" options={{ title: 'Rayon Catégorie' }} />
            <Stack.Screen name="orders/[id]" options={{ title: 'Suivi de commande' }} />
          </Stack>
        </ThemeProvider>
      </FavoritesProvider>
    </CartProvider>
  );
}
