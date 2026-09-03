import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../context/auth-context';
import { usePushNotifications } from '../lib/usePushNotifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppNavigation() {
  const { user } = useAuth();
  
  // Initialisation et écoute des notifications push pour le vendeur connecté
  usePushNotifications(user?.id);

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
