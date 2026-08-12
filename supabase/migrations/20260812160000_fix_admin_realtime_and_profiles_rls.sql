-- Migration: Fix Admin Read Permissions & Enable Supabase Realtime for Back-Office
-- Date: 2026-08-12

-- 1. Ensure public/admin SELECT is allowed on profiles table
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Allow read profiles" ON public.profiles;
    
    CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
    CREATE POLICY "Admin update profiles" ON public.profiles FOR UPDATE USING (true);
    CREATE POLICY "Admin insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Ensure public/admin SELECT is allowed on shops
ALTER TABLE IF EXISTS public.shops ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public read shops" ON public.shops;
    CREATE POLICY "Public read shops" ON public.shops FOR SELECT USING (true);
    CREATE POLICY "Admin update shops" ON public.shops FOR ALL USING (true);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. Enable Realtime Publications for live sync across Admin Dashboard
DO $$
BEGIN
    -- Add tables to supabase_realtime publication if not already added
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shops;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_points;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
