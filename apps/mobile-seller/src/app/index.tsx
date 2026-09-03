import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/auth-context';

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/splash');
      }
    }
  }, [user, loading]);

  return (
    <View style={{ flex: 1, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}
