-- Migration: Unification et Fiabilisation des Notifications Multi-Profils
-- Fichier: 20260906120000_unify_and_fix_all_notifications.sql

-- 1. Table customer_notifications : lever les contraintes de types restrictives
ALTER TABLE public.customer_notifications DROP CONSTRAINT IF EXISTS customer_notifications_type_check;
ALTER TABLE public.customer_notifications ALTER COLUMN type TYPE TEXT;
ALTER TABLE public.customer_notifications ALTER COLUMN type SET DEFAULT 'info';
ALTER TABLE public.customer_notifications ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.customer_notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.customer_notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Table seller_notifications : assouplir shop_id et type
ALTER TABLE public.seller_notifications ALTER COLUMN shop_id DROP NOT NULL;
ALTER TABLE public.seller_notifications DROP CONSTRAINT IF EXISTS seller_notifications_type_check;
ALTER TABLE public.seller_notifications ALTER COLUMN type TYPE TEXT;
ALTER TABLE public.seller_notifications ALTER COLUMN type SET DEFAULT 'info';
ALTER TABLE public.seller_notifications ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.seller_notifications ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.seller_notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.seller_notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Table admin_notifications : s'assurer des colonnes et RLS
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    notification_type TEXT DEFAULT 'info',
    target_role TEXT DEFAULT 'all',
    is_broadcast BOOLEAN DEFAULT TRUE,
    is_read BOOLEAN DEFAULT FALSE,
    image_url TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins read notifications" ON public.admin_notifications;
    DROP POLICY IF EXISTS "Public insert admin notifications" ON public.admin_notifications;
    
    CREATE POLICY "Admins read notifications" ON public.admin_notifications
        FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 4. Publication Realtime pour synchronisation instantanée
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.push_campaigns;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
