"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface FavoriteProduct {
  id: string;
  shop_id?: string;
  title: string;
  price: number;
  old_price?: number | null;
  image_url?: string | null;
  category?: string;
}

interface FavoritesContextType {
  favorites: FavoriteProduct[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (product: FavoriteProduct) => Promise<boolean>;
  totalFavorites: number;
  isLoading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);
const STORAGE_KEY = "kalagban_web_favorites_v1";

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Initial Load from LocalStorage and Supabase
  const loadFavorites = useCallback(async (uid: string | null) => {
    let localFavs: FavoriteProduct[] = [];
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) localFavs = JSON.parse(stored);
      } catch (err) {
        console.error("Error reading favorites from localStorage:", err);
      }
    }

    if (uid) {
      try {
        const { data: dbWishlist } = await supabase
          .from("wishlists")
          .select("id, product_id, products(id, shop_id, title, price, old_price, category, product_media(url))")
          .eq("user_id", uid);

        if (dbWishlist && dbWishlist.length > 0) {
          const dbFavs: FavoriteProduct[] = dbWishlist
            .filter((w) => w.products)
            .map((w: any) => {
              const p = w.products;
              const img = p.product_media && p.product_media.length > 0 ? p.product_media[0].url : null;
              return {
                id: p.id,
                shop_id: p.shop_id,
                title: p.title,
                price: Number(p.price || 0),
                old_price: p.old_price ? Number(p.old_price) : null,
                image_url: img,
                category: p.category,
              };
            });

          // Merge local & db
          const mergedMap = new Map<string, FavoriteProduct>();
          localFavs.forEach((f) => mergedMap.set(f.id, f));
          dbFavs.forEach((f) => mergedMap.set(f.id, f));

          const merged = Array.from(mergedMap.values());
          setFavorites(merged);
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
          return;
        }
      } catch (err) {
        console.error("Error fetching wishlist from Supabase:", err);
      }
    }

    setFavorites(localFavs);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      void loadFavorites(uid).finally(() => setIsLoading(false));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id || null;
      setUserId(uid);
      void loadFavorites(uid);
    });

    return () => subscription.unsubscribe();
  }, [loadFavorites]);

  // 2. Check if item is in favorites
  const isFavorite = useCallback(
    (productId: string) => {
      return favorites.some((f) => f.id === productId);
    },
    [favorites]
  );

  // 3. Toggle favorite (Add / Remove)
  const toggleFavorite = async (product: FavoriteProduct): Promise<boolean> => {
    const currentlyFav = favorites.some((f) => f.id === product.id);
    let updated: FavoriteProduct[];

    if (currentlyFav) {
      updated = favorites.filter((f) => f.id !== product.id);
    } else {
      updated = [...favorites, product];
    }

    setFavorites(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }

    // If user is authenticated, sync with Supabase wishlists table
    if (userId) {
      try {
        if (currentlyFav) {
          await supabase
            .from("wishlists")
            .delete()
            .eq("user_id", userId)
            .eq("product_id", product.id);
        } else {
          await supabase
            .from("wishlists")
            .upsert({
              user_id: userId,
              product_id: product.id,
            }, { onConflict: "user_id,product_id" });
        }
      } catch (err) {
        console.error("Error syncing wishlist with Supabase:", err);
      }
    }

    return !currentlyFav;
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isFavorite,
        toggleFavorite,
        totalFavorites: favorites.length,
        isLoading,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};
