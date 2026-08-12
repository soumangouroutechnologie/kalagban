-- ==============================================================================
-- Migration: Création du Compte Super Administrateur & Déblocage RLS Kalagban
-- Date: 2026-08-12
-- Identifiants: admin@kalagban.ci / password123
-- ==============================================================================

-- 1. Création de l'utilisateur Super Admin dans auth.users et public.profiles
DO $$
DECLARE
    admin_uid UUID := 'a0000000-0000-0000-0000-000000000001';
    admin_email TEXT := 'admin@kalagban.ci';
    admin_pwd TEXT := 'password123';
BEGIN
    -- Insertion dans auth.users
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role
    )
    VALUES (
        admin_uid,
        '00000000-0000-0000-0000-000000000000',
        admin_email,
        crypt(admin_pwd, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Super Administrateur Kalagban","role":"admin","admin_role":"super_admin"}'::jsonb,
        false,
        'authenticated'
    )
    ON CONFLICT (id) DO UPDATE
    SET encrypted_password = crypt(admin_pwd, gen_salt('bf')),
        email = admin_email,
        email_confirmed_at = NOW(),
        raw_user_meta_data = '{"full_name":"Super Administrateur Kalagban","role":"admin","admin_role":"super_admin"}'::jsonb;

    -- Insertion dans auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
    )
    VALUES (
        admin_uid,
        admin_uid,
        format('{"sub":"%s","email":"%s"}', admin_uid, admin_email)::jsonb,
        'email',
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (provider, id) DO NOTHING;

    -- Insertion dans public.profiles
    INSERT INTO public.profiles (
        id,
        full_name,
        phone,
        role,
        admin_role,
        status,
        created_at
    )
    VALUES (
        admin_uid,
        'Super Administrateur Kalagban',
        '+225 07 00 00 00 00',
        'admin',
        'super_admin',
        'active',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = 'Super Administrateur Kalagban',
        role = 'admin',
        admin_role = 'super_admin',
        status = 'active';

    -- Insertion des permissions maximales dans public.admin_permissions
    INSERT INTO public.admin_permissions (
        user_id,
        can_manage_team,
        can_edit_cms,
        can_view_finance,
        can_moderate_shops,
        updated_at
    )
    VALUES (
        admin_uid,
        true,
        true,
        true,
        true,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET can_manage_team = true,
        can_edit_cms = true,
        can_view_finance = true,
        can_moderate_shops = true,
        updated_at = NOW();

END $$;

-- 2. Débloquer la lecture des profils utilisateurs pour le Back-Office Admin
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

-- 3. Débloquer la lecture des boutiques pour le Back-Office Admin
ALTER TABLE IF EXISTS public.shops ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public read shops" ON public.shops;
    CREATE POLICY "Public read shops" ON public.shops FOR SELECT USING (true);
    CREATE POLICY "Admin update shops" ON public.shops FOR ALL USING (true);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 4. Activer le Temps Réel (Supabase Realtime) sur toutes les tables d'administration
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.shops; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_points; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 5. Rafraîchissement du cache de schéma PostgREST
NOTIFY pgrst, 'reload schema';
