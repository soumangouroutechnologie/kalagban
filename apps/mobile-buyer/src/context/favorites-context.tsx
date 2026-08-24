import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export interface FavoriteItem {
  id: string;
  title: string;
  price: number;
  old_price?: number;
  image_url: string;
  shop_name?: string;
}

interface FavoritesContextType {
  favorites: FavoriteItem[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (item: FavoriteItem) => Promise<{ success: boolean; requiresAuth?: boolean }>;
  isAuthenticated: boolean;
  user: any;
  checkAuthStatus: () => Promise<boolean>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);
const FAVORITES_STORAGE_KEY = '@kalagban_mobile_favorites';

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuthStatus();
    loadFavorites();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const checkAuthStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user || null;
    setUser(currentUser);
    return !!currentUser;
  };

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load favorites', e);
    }
  };

  const saveFavorites = async (items: FavoriteItem[]) => {
    try {
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save favorites', e);
    }
  };

  const isFavorite = (id: string) => {
    return favorites.some((item) => item.id === id);
  };

  const toggleFavorite = async (item: FavoriteItem): Promise<{ success: boolean; requiresAuth?: boolean }> => {
    const sessionRes = await supabase.auth.getSession();
    const currentUser = sessionRes.data.session?.user || null;
    setUser(currentUser);

    const exists = favorites.some((fav) => fav.id === item.id);
    let updated: FavoriteItem[];
    if (exists) {
      updated = favorites.filter((fav) => fav.id !== item.id);
    } else {
      updated = [...favorites, item];
    }
    setFavorites(updated);
    await saveFavorites(updated);

    if (currentUser?.id) {
      try {
        if (exists) {
          await supabase
            .from('wishlists')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('product_id', item.id);
        } else {
          await supabase
            .from('wishlists')
            .upsert({
              user_id: currentUser.id,
              product_id: item.id,
            }, { onConflict: 'user_id,product_id' });
        }
      } catch (err) {
        console.error('Error syncing wishlist with Supabase:', err);
      }
    }

    return { success: true };
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
        isAuthenticated: !!user,
        user,
        checkAuthStatus,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
