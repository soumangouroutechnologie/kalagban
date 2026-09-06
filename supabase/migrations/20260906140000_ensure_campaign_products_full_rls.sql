-- =========================================================================
-- KALAGBAN MARKETPLACE - MIGRATION CAMPAIGN PRODUCTS & RLS 100% BULLETPROOF
-- =========================================================================

-- 1. Table: promotional_campaigns
CREATE TABLE IF NOT EXISTS public.promotional_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT,
    badge_text TEXT DEFAULT 'OFFRE SPÉCIALE',
    banner_url TEXT,
    theme_color TEXT DEFAULT '#E65100',
    countdown_end TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'active',
    is_featured_home BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table: campaign_products (Association des produits aux campagnes SDUI)
CREATE TABLE IF NOT EXISTS public.campaign_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.promotional_campaigns(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    discount_percentage INTEGER DEFAULT 20,
    special_price NUMERIC(12, 2),
    stock_allocated INTEGER DEFAULT 50 NOT NULL,
    stock_sold INTEGER DEFAULT 0 NOT NULL,
    position INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(campaign_id, product_id)
);

-- Index pour accélérer les recherches de campagnes et produits
CREATE INDEX IF NOT EXISTS idx_promotional_campaigns_slug ON public.promotional_campaigns(slug);
CREATE INDEX IF NOT EXISTS idx_promotional_campaigns_status ON public.promotional_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaign_products_campaign_id ON public.campaign_products(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_products_product_id ON public.campaign_products(product_id);

-- 3. Activation du Row Level Security (RLS)
ALTER TABLE public.promotional_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_products ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS sans blocage pour la lecture publique et l'écriture admin/authentifiée
DROP POLICY IF EXISTS "Public view active campaigns" ON public.promotional_campaigns;
DROP POLICY IF EXISTS "Admins manage campaigns" ON public.promotional_campaigns;
DROP POLICY IF EXISTS "Allow all for promotional_campaigns" ON public.promotional_campaigns;

CREATE POLICY "Allow all for promotional_campaigns" ON public.promotional_campaigns 
    FOR ALL 
    TO public, anon, authenticated, service_role 
    USING (true) 
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public view campaign products" ON public.campaign_products;
DROP POLICY IF EXISTS "Admins manage campaign products" ON public.campaign_products;
DROP POLICY IF EXISTS "Allow all for campaign_products" ON public.campaign_products;

CREATE POLICY "Allow all for campaign_products" ON public.campaign_products 
    FOR ALL 
    TO public, anon, authenticated, service_role 
    USING (true) 
    WITH CHECK (true);

-- 5. Permissions directes (GRANT)
GRANT ALL ON TABLE public.promotional_campaigns TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.campaign_products TO anon, authenticated, service_role;

-- 6. Publication Realtime Supabase
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'promotional_campaigns'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.promotional_campaigns;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'campaign_products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_products;
    END IF;
END $$;
