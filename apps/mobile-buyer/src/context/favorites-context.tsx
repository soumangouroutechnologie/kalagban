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
  loading: boolean;
  checkAuthStatus: () => Promise<boolean>;
  loadFavorites: (userIdOverride?: string | null) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);
const FAVORITES_STORAGE_KEY = '@kalagban_mobile_favorites';

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    checkAuthStatus();
    loadFavorites();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      loadFavorites(currentUser?.id || null);
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

  const loadFavorites = async (userIdOverride?: string | null) => {
    setLoading(true);
    let localFavs: FavoriteItem[] = [];
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        localFavs = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load favorites from AsyncStorage', e);
    }

    const { data: { session } } = await supabase.auth.getSession();
    const uid = userIdOverride !== undefined ? userIdOverride : (session?.user?.id || null);

    if (uid) {
      try {
        const { data: dbWishlist, error } = await supabase
          .from('wishlists')
          .select('id, product_id, products(id, title, price, old_price, product_media(url), shops(name))')
          .eq('user_id', uid);

        if (!error && dbWishlist) {
          const dbFavs: FavoriteItem[] = dbWishlist
            .filter((w: any) => w.products)
            .map((w: any) => {
              const p = w.products;
              const img = p.product_media && p.product_media.length > 0 ? p.product_media[0].url : '';
              return {
                id: p.id,
                title: p.title,
                price: Number(p.price || 0),
                old_price: p.old_price ? Number(p.old_price) : undefined,
                image_url: img,
                shop_name: p.shops?.name || 'Vendeur Kalagban',
              };
            });

          setFavorites(dbFavs);
          await saveFavorites(dbFavs);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Failed to fetch wishlist from Supabase', err);
      }
    }

    setFavorites(localFavs);
    setLoading(false);
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
          const { error: delErr } = await supabase
            .from('wishlists')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('product_id', item.id);
          if (delErr) console.warn('Error removing from wishlists:', delErr);
        } else {
          const { error: insErr } = await supabase
            .from('wishlists')
            .upsert({
              user_id: currentUser.id,
              product_id: item.id,
            }, { onConflict: 'user_id,product_id' });
          if (insErr) console.warn('Error adding to wishlists:', insErr);
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
        loading,
        checkAuthStatus,
        loadFavorites,
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
