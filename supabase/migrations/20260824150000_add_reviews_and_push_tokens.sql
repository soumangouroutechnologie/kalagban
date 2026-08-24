-- Migration: Table product_reviews, tokens Expo push et autorisations
-- Date: 2026-08-24

-- 1. Table product_reviews (Notes et avis simples 1 à 5 étoiles)
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    status VARCHAR(50) DEFAULT 'published' CHECK (status IN ('published', 'pending', 'hidden')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read product_reviews" ON public.product_reviews FOR SELECT USING (status = 'published');
CREATE POLICY "Authenticated user insert review" ON public.product_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin manage reviews" ON public.product_reviews FOR ALL USING (true);

-- 2. Ajout du champ expo_push_token dans profiles pour les push notifications mobiles
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS expo_push_token VARCHAR(255);

-- 3. Ajout de la permission can_manage_reviews dans admin_users
ALTER TABLE public.admin_users
    ADD COLUMN IF NOT EXISTS can_manage_reviews BOOLEAN DEFAULT true;

-- 4. Enable Realtime pour product_reviews
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.product_reviews; EXCEPTION WHEN OTHERS THEN NULL; END $$;
