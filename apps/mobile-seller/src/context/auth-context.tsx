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
  sendOtpSeller: (
    identifier: string,
    type: 'email' | 'phone',
    shopName?: string,
    firstName?: string,
    lastName?: string
  ) => Promise<{ error?: any }>;
  verifyOtpSeller: (
    identifier: string,
    type: 'email' | 'phone',
    token: string,
    shopName?: string,
    firstName?: string,
    lastName?: string,
    password?: string
  ) => Promise<{ error?: any }>;
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

      // 2. Fetch Shop owned by currentUser (where auth.uid() == shop.id)
      const { data: shopData } = await supabase
        .from('shops')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (shopData) {
        setShop(shopData as ShopProfile);
      } else {
        setShop(null);
      }
    } catch (err) {
      console.error('Error loading seller data:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const u = session?.user ?? null;
        if (isMounted) setUser(u);
        if (u) {
          await fetchUserData(u);
        }
      } catch (err) {
        console.error('Error initializing seller auth:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;
      if (isMounted) setUser(u);
      if (u) {
        await fetchUserData(u);
      } else {
        if (isMounted) {
          setShop(null);
          setProfile(null);
        }
      }
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });
      if (error) {
        return { error };
      }
      if (data.user) {
        setUser(data.user);
        await fetchUserData(data.user);
      }
      return { data };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signInWithPhone = async (phone: string, pass: string) => {
    setLoading(true);
    try {
      const emailFormatted = phone.replace(/[^0-9]/g, '') + '@kalagban.seller';
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailFormatted,
        password: pass,
      });
      if (error) {
        return { error };
      }
      if (data.user) {
        setUser(data.user);
        await fetchUserData(data.user);
      }
      return { data };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (p: string) => {
    let clean = p.replace(/[^0-9]/g, '');
    if (clean.length === 10 && (clean.startsWith('07') || clean.startsWith('05') || clean.startsWith('01'))) {
      clean = '+225' + clean;
    } else if (!clean.startsWith('+')) {
      clean = '+' + clean;
    }
    return clean;
  };

  const sendOtpSeller = async (
    identifier: string,
    type: 'email' | 'phone',
    shopName: string = '',
    firstName: string = '',
    lastName: string = ''
  ) => {
    setLoading(true);
    try {
      if (type === 'email') {
        const { error } = await supabase.auth.signInWithOtp({
          email: identifier.trim(),
          options: {
            shouldCreateUser: true,
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`.trim() || shopName,
              shop_name: shopName,
              role: 'seller',
            },
          },
        });
        if (error) throw error;
      } else {
        const formatted = formatPhone(identifier);
        const { error } = await supabase.auth.signInWithOtp({
          phone: formatted,
          options: {
            shouldCreateUser: true,
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`.trim() || shopName,
              shop_name: shopName,
              role: 'seller',
            },
          },
        });
        if (error) throw error;
      }
      return {};
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpSeller = async (
    identifier: string,
    type: 'email' | 'phone',
    token: string,
    shopName: string = '',
    firstName: string = '',
    lastName: string = '',
    password?: string
  ) => {
    setLoading(true);
    try {
      let authRes;
      if (type === 'email') {
        authRes = await supabase.auth.verifyOtp({
          email: identifier.trim(),
          token: token.trim(),
          type: 'email',
        });
      } else {
        const formatted = formatPhone(identifier);
        authRes = await supabase.auth.verifyOtp({
          phone: formatted,
          token: token.trim(),
          type: 'sms',
        });
      }

      if (authRes.error) throw authRes.error;

      if (authRes.data.session) {
        await supabase.auth.setSession({
          access_token: authRes.data.session.access_token,
          refresh_token: authRes.data.session.refresh_token,
        });
      }

      if (authRes.data.user) {
        const u = authRes.data.user;

        if (password && password.length >= 6) {
          try {
            await supabase.auth.updateUser({ password });
          } catch (e) {
            console.warn('Seller password save error:', e);
          }
        }

        setUser(u);

        // Upsert Profile
        await supabase.from('profiles').upsert({
          id: u.id,
          first_name: firstName || u.user_metadata?.first_name,
          last_name: lastName || u.user_metadata?.last_name,
          full_name: `${firstName} ${lastName}`.trim() || u.user_metadata?.full_name || shopName,
          phone: type === 'phone' ? identifier : u.user_metadata?.phone,
          email: type === 'email' ? identifier : u.email,
          role: 'seller',
        });

        // Create/Verify Shop if shopName provided
        if (shopName) {
          const { data: existingShop } = await supabase
            .from('shops')
            .select('*')
            .eq('id', u.id)
            .maybeSingle();

          if (!existingShop) {
            const { data: newShop } = await supabase.from('shops').insert({
              id: u.id,
              name: shopName,
              description: `Boutique officielle de ${shopName}`,
              status: 'active',
              is_featured: false,
            }).select().single();

            if (newShop) setShop(newShop as ShopProfile);
          } else {
            setShop(existingShop as ShopProfile);
          }
        }

        await fetchUserData(u);
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
        sendOtpSeller,
        verifyOtpSeller,
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
