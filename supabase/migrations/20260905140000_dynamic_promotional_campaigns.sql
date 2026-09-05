-- Migration: Tables pour le Moteur de Campagnes Promotionnelles Dynamiques (Server-Driven UI)

-- 1. Table: promotional_campaigns
CREATE TABLE IF NOT EXISTS public.promotional_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT,
    badge_text TEXT DEFAULT 'OFFRE SPÉCIALE',
    banner_url TEXT,
    theme_color TEXT DEFAULT '#E65100', -- Couleur dominante / code hex
    countdown_end TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'draft', 'ended'
    is_featured_home BOOLEAN DEFAULT true,
    position INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table: campaign_products (Association des produits avec réductions et stocks promo dédiés)
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

-- 3. Activation du Row Level Security (RLS)
ALTER TABLE public.promotional_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_products ENABLE ROW LEVEL SECURITY;

-- 4. Politiques RLS
DROP POLICY IF EXISTS "Public view active campaigns" ON public.promotional_campaigns;
CREATE POLICY "Public view active campaigns" ON public.promotional_campaigns 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage campaigns" ON public.promotional_campaigns;
CREATE POLICY "Admins manage campaigns" ON public.promotional_campaigns 
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public view campaign products" ON public.campaign_products;
CREATE POLICY "Public view campaign products" ON public.campaign_products 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage campaign products" ON public.campaign_products;
CREATE POLICY "Admins manage campaign products" ON public.campaign_products 
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Insertion de données initiales de démonstration (ex: Spécial Rentrée Scolaire 2026 & Ventes Flash)
INSERT INTO public.promotional_campaigns (slug, title, subtitle, badge_text, theme_color, countdown_end, status, is_featured_home, position)
VALUES 
(
    'rentree-scolaire',
    '🎒 Grand Spécial Rentrée Scolaire 2026',
    'Kits complets, sacs à dos et fournitures certifiées aux meilleurs prix de Conakry !',
    'JUSQU''À -40%',
    '#E65100',
    (now() + interval '15 days'),
    'active',
    true,
    1
),
(
    'ventes-flash-weekend',
    '⚡ Méga Ventes Flash du Week-end',
    'Offres chronométrées avec stocks limités sur la téléphonie et l''électroménager.',
    'VENTES FLASH',
    '#DC2626',
    (now() + interval '2 days'),
    'active',
    true,
    2
)
ON CONFLICT (slug) DO NOTHING;
