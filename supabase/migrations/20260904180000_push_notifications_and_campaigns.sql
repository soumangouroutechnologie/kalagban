-- ==============================================================================
-- Migration : Système Complet de Notifications Push & Campagnes Marketing / Support
-- Date : 2026-09-04
-- Description : Tables pour customer_notifications, seller_notifications, push_campaigns
--               et indexation des tokens push pour alertes ciblées et de masse.
-- ==============================================================================

-- 1. S'assurer que le champ expo_push_token existe sur profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'expo_push_token'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN expo_push_token TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_expo_push_token ON public.profiles(expo_push_token) WHERE expo_push_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. Table des notifications clients (in-app)
CREATE TABLE IF NOT EXISTS public.customer_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'order_update',
    order_id UUID,
    reference_id TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer ON public.customer_notifications(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_order ON public.customer_notifications(order_id);

-- RLS sur customer_notifications
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Customer read own notifications" ON public.customer_notifications;
    DROP POLICY IF EXISTS "Public insert notifications" ON public.customer_notifications;
    DROP POLICY IF EXISTS "Customer update own notifications" ON public.customer_notifications;
    
    CREATE POLICY "Customer read own notifications" ON public.customer_notifications
        FOR SELECT TO authenticated USING (auth.uid() = customer_id);

    CREATE POLICY "Public insert notifications" ON public.customer_notifications
        FOR INSERT TO authenticated, anon WITH CHECK (true);

    CREATE POLICY "Customer update own notifications" ON public.customer_notifications
        FOR UPDATE TO authenticated USING (auth.uid() = customer_id);
END $$;

-- 3. Table des notifications vendeurs (in-app)
CREATE TABLE IF NOT EXISTS public.seller_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    shop_id UUID,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'order_update',
    order_id UUID,
    reference_id TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_notifications_seller ON public.seller_notifications(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_order ON public.seller_notifications(order_id);

-- RLS sur seller_notifications
ALTER TABLE public.seller_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Seller read own notifications" ON public.seller_notifications;
    DROP POLICY IF EXISTS "Public insert seller notifications" ON public.seller_notifications;
    DROP POLICY IF EXISTS "Seller update own notifications" ON public.seller_notifications;
    
    CREATE POLICY "Seller read own notifications" ON public.seller_notifications
        FOR SELECT TO authenticated USING (auth.uid() = seller_id);

    CREATE POLICY "Public insert seller notifications" ON public.seller_notifications
        FOR INSERT TO authenticated, anon WITH CHECK (true);

    CREATE POLICY "Seller update own notifications" ON public.seller_notifications
        FOR UPDATE TO authenticated USING (auth.uid() = seller_id);
END $$;

-- 4. Table des campagnes de notifications (Marketing, Admin, Support)
CREATE TABLE IF NOT EXISTS public.push_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_type TEXT NOT NULL, -- 'all', 'all_buyers', 'all_sellers', 'specific_buyer', 'specific_seller'
    target_id UUID,            -- Si cible spécifique (profil ou boutique)
    target_name TEXT,          -- Nom affiché de la cible pour l'historique
    sent_by TEXT NOT NULL,     -- Auteur (Admin, Marketing, Support)
    sent_by_role TEXT DEFAULT 'admin',
    notification_type TEXT DEFAULT 'promo', -- 'promo', 'info', 'alert', 'support', 'system'
    url_redirect TEXT,
    recipients_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    status TEXT DEFAULT 'sent', -- 'sent', 'partial', 'failed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_campaigns_created_at ON public.push_campaigns(created_at DESC);

-- RLS sur push_campaigns
ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins manage push campaigns" ON public.push_campaigns;
    CREATE POLICY "Admins manage push campaigns" ON public.push_campaigns
        FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
END $$;

-- 5. Activation de la publication Realtime pour les notifications
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_notifications;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_notifications;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.push_campaigns;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
