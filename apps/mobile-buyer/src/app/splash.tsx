import React from 'react';
import { useRouter } from 'expo-router';
import SplashScreen from '@/components/SplashScreen';

export default function SplashPage() {
  const router = useRouter();

  const handleFinish = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return <SplashScreen onFinish={handleFinish} />;
}
