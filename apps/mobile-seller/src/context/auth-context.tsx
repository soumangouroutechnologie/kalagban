import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface ShopProfile {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  payout_provider?: string;
  payout_phone?: string;
  is_featured?: boolean;
  featured_badge?: string;
  status?: string;
  created_at?: string;
}

export interface UserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  email?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  shop: ShopProfile | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<{ error?: any }>;
  signInWithPhone: (phone: string, pass: string) => Promise<{ error?: any }>;
  signUpSeller: (
    identifier: string,
    type: 'email' | 'phone',
    pass: string,
    shopName: string,
    firstName?: string,
    lastName?: string
  ) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  refreshShopData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [shop, setShop] = useState<ShopProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (currentUser: User) => {
    try {
      // 1. Fetch Profile
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      
      if (prof) {
        setProfile(prof as UserProfile);
      }

      // 2. Fetch Shop owned by currentUser (where auth.uid() == shop.id or via user_id link)
      let { data: shopData } = await supabase
        .from('shops')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      // If not found by ID directly, fallback search by name or general query
      if (!shopData) {
        const { data: fallbackShop } = await supabase
          .from('shops')
          .select('*')
          .limit(1)
          .single();
        if (fallbackShop) {
          shopData = fallbackShop;
        }
      }

      if (shopData) {
        setShop(shopData as ShopProfile);
      }
    } catch (err) {
      console.error('Error loading seller data:', err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchUserData(u);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        await fetchUserData(u);
      } else {
        setShop(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) throw error;
      if (data.user) {
        await fetchUserData(data.user);
      }
      return {};
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signInWithPhone = async (phone: string, pass: string) => {
    setLoading(true);
    try {
      // In Supabase, phone auth password login can use formatted email or phone auth
      const emailFormatted = phone.replace(/[^0-9]/g, '') + '@kalagban.seller';
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailFormatted,
        password: pass,
      });
      if (error) throw error;
      if (data.user) {
        await fetchUserData(data.user);
      }
      return {};
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUpSeller = async (
    identifier: string,
    type: 'email' | 'phone',
    pass: string,
    shopName: string,
    firstName: string = '',
    lastName: string = ''
  ) => {
    setLoading(true);
    try {
      const emailToUse = type === 'email' 
        ? identifier 
        : `${identifier.replace(/[^0-9]/g, '')}@kalagban.seller`;

      const { data, error } = await supabase.auth.signUp({
        email: emailToUse,
        password: pass,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: type === 'phone' ? identifier : undefined,
            role: 'seller',
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Create profile in profiles table
        await supabase.from('profiles').upsert({
          id: data.user.id,
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim() || shopName,
          phone: type === 'phone' ? identifier : undefined,
          role: 'seller',
        });

        // Create shop in shops table
        const { data: newShop, error: shopErr } = await supabase.from('shops').insert({
          id: data.user.id,
          name: shopName,
          description: `Boutique officielle de ${shopName}`,
          status: 'active',
          is_featured: false,
        }).select().single();

        if (newShop) {
          setShop(newShop as ShopProfile);
        }
      }

      return {};
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setShop(null);
    setProfile(null);
  };

  const refreshShopData = async () => {
    if (user) {
      await fetchUserData(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        shop,
        profile,
        loading,
        signInWithEmail,
        signInWithPhone,
        signUpSeller,
        signOut,
        refreshShopData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
