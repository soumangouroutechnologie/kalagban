import React, { useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreenNative from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { CartProvider } from '@/context/cart-context';
import { FavoritesProvider } from '@/context/favorites-context';
import SplashScreen from '@/components/SplashScreen';

SplashScreenNative.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showSplash, setShowSplash] = useState(true);

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
