-- ==============================================================================
-- Migration: Création du Compte Super Administrateur & Déblocage RLS Kalagban
-- Date: 2026-08-12
-- Identifiants: admin@kalagban.ci / password123
-- ==============================================================================

DO $$
DECLARE
    admin_uid UUID := 'a0000000-0000-0000-0000-000000000001';
    admin_email TEXT := 'admin@kalagban.ci';
    admin_pwd TEXT := 'password123';
BEGIN
    -- 1. Inscription dans auth.users
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

    -- 2. Liaison auth.identities (Nettoyage préalable puis réinsertion propre)
    DELETE FROM auth.identities WHERE user_id = admin_uid OR id = admin_uid::text;

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
        admin_uid::text,
        admin_uid,
        format('{"sub":"%s","email":"%s"}', admin_uid, admin_email)::jsonb,
        'email',
        NOW(),
        NOW(),
        NOW()
    );

    -- 3. Fiche de profil dans public.profiles
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

    -- 4. Droits complets dans public.admin_permissions
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

-- 5. Déblocage de la visibilité des profils pour l'administration (RLS)
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Admin update profiles" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Admin insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);

-- 6. Déblocage des boutiques (RLS)
ALTER TABLE IF EXISTS public.shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read shops" ON public.shops;
CREATE POLICY "Public read shops" ON public.shops FOR SELECT USING (true);
CREATE POLICY "Admin update shops" ON public.shops FOR ALL USING (true);

-- 7. Activation de la synchronisation Temps Réel (Supabase Realtime)
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.shops; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_points; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings; EXCEPTION WHEN OTHERS THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
