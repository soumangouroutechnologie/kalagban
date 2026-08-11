-- Migration: Tables pour Ventes Flash et Bannières Promotionnelles de la Page d'Accueil

-- 1. Table: flash_sales (Campagnes de Ventes Flash avec Décompte Chrono)
CREATE TABLE IF NOT EXISTS public.flash_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'ended'
    discount_percentage INTEGER DEFAULT 25,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table: flash_sale_products (Association des produits aux ventes flash avec prix spécial)
CREATE TABLE IF NOT EXISTS public.flash_sale_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flash_sale_id UUID NOT NULL REFERENCES public.flash_sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    special_price NUMERIC(12, 2) NOT NULL,
    stock_allocated INTEGER DEFAULT 10 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(flash_sale_id, product_id)
);

-- 3. Table: promotional_banners (Bannières d'accueil configurables)
CREATE TABLE IF NOT EXISTS public.promotional_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    badge_text TEXT DEFAULT 'OFFRE SPÉCIALE',
    image_url TEXT,
    target_url TEXT DEFAULT '#catalogue',
    is_active BOOLEAN DEFAULT true NOT NULL,
    position INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Activation du Row Level Security (RLS)
ALTER TABLE public.flash_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flash_sale_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;

-- Politiques de lecture publique (Tout le monde peut voir les ventes flash et bannières actives)
CREATE POLICY "Anyone can view active flash sales" ON public.flash_sales FOR SELECT USING (true);
CREATE POLICY "Anyone can view flash sale products" ON public.flash_sale_products FOR SELECT USING (true);
CREATE POLICY "Anyone can view promotional banners" ON public.promotional_banners FOR SELECT USING (is_active = true);
