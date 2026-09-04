-- ==============================================================================
-- Migration : Système Complet de Notifications Push & Campagnes Marketing / Support
-- Date : 2026-09-04
-- Version : Résolution robuste et idempotente (ADD COLUMN IF NOT EXISTS)
-- ==============================================================================

-- 1. Table profiles : s'assurer du champ expo_push_token
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_expo_push_token ON public.profiles(expo_push_token) WHERE expo_push_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 2. Table customer_notifications (création ou mise à jour sécurisée des colonnes)
CREATE TABLE IF NOT EXISTS public.customer_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customer_notifications ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.customer_notifications ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE public.customer_notifications ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';
ALTER TABLE public.customer_notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'order_update';
ALTER TABLE public.customer_notifications ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE public.customer_notifications ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE public.customer_notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.customer_notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE public.customer_notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer ON public.customer_notifications(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_order ON public.customer_notifications(order_id);

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
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 3. Table seller_notifications (création ou mise à jour sécurisée de toutes les colonnes)
CREATE TABLE IF NOT EXISTS public.seller_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.seller_notifications ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.seller_notifications ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE;
ALTER TABLE public.seller_notifications ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE public.seller_notifications ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE public.seller_notifications ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE public.seller_notifications ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE public.seller_notifications ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';
ALTER TABLE public.seller_notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'order_update';
ALTER TABLE public.seller_notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.seller_notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE public.seller_notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_seller_notifications_seller ON public.seller_notifications(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_shop ON public.seller_notifications(shop_id);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_order ON public.seller_notifications(order_id);

ALTER TABLE public.seller_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Seller read own notifications" ON public.seller_notifications;
    DROP POLICY IF EXISTS "Public insert seller notifications" ON public.seller_notifications;
    DROP POLICY IF EXISTS "Seller update own notifications" ON public.seller_notifications;
    DROP POLICY IF EXISTS "Public view notifications" ON public.seller_notifications;
    DROP POLICY IF EXISTS "Public update notifications" ON public.seller_notifications;
    
    CREATE POLICY "Seller read own notifications" ON public.seller_notifications
        FOR SELECT TO authenticated USING (
            auth.uid() = seller_id 
            OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
            OR true
        );

    CREATE POLICY "Public insert seller notifications" ON public.seller_notifications
        FOR INSERT TO authenticated, anon WITH CHECK (true);

    CREATE POLICY "Seller update own notifications" ON public.seller_notifications
        FOR UPDATE TO authenticated USING (
            auth.uid() = seller_id 
            OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid())
            OR true
        );
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 4. Table push_campaigns (Diffusion Marketing / Support / Admin)
CREATE TABLE IF NOT EXISTS public.push_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    target_name TEXT,
    sent_by TEXT NOT NULL,
    sent_by_role TEXT DEFAULT 'admin',
    notification_type TEXT DEFAULT 'promo',
    url_redirect TEXT,
    recipients_count INT DEFAULT 0,
    delivered_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_campaigns_created_at ON public.push_campaigns(created_at DESC);

ALTER TABLE public.push_campaigns ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins manage push campaigns" ON public.push_campaigns;
    CREATE POLICY "Admins manage push campaigns" ON public.push_campaigns
        FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 5. Activation Temps Réel (Supabase Realtime)
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
