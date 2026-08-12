-- ==============================================================================
-- Migration: Espace de Modération des Produits & Notifications Vendeurs Temps Réel
-- Date: 2026-08-12
-- ==============================================================================

-- 1. Ajout des colonnes de modération sur public.products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(30) DEFAULT 'pending_review' CHECK (moderation_status IN ('pending_review', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reviewed_by UUID DEFAULT NULL;

-- Mise à jour des produits existants actifs en 'approved'
UPDATE public.products 
SET moderation_status = 'approved' 
WHERE status = 'active' AND (moderation_status IS NULL OR moderation_status = 'pending_review');

-- 2. Ajout de la permission modération produits sur public.admin_permissions
ALTER TABLE public.admin_permissions
ADD COLUMN IF NOT EXISTS can_moderate_products BOOLEAN DEFAULT true;

-- 3. Création de la table des notifications vendeurs
CREATE TABLE IF NOT EXISTS public.seller_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'product_moderation',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activation de RLS sur seller_notifications
ALTER TABLE public.seller_notifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Sellers view own notifications" ON public.seller_notifications;
    DROP POLICY IF EXISTS "Public view notifications" ON public.seller_notifications;
    DROP POLICY IF EXISTS "Admins manage notifications" ON public.seller_notifications;

    CREATE POLICY "Public view notifications" ON public.seller_notifications FOR SELECT USING (true);
    CREATE POLICY "Public insert notifications" ON public.seller_notifications FOR INSERT WITH CHECK (true);
    CREATE POLICY "Public update notifications" ON public.seller_notifications FOR UPDATE USING (true);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 4. Déblocage des RLS sur products pour que l'admin puisse mettre à jour le statut de modération
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admin update all products" ON public.products;
    CREATE POLICY "Admin update all products" ON public.products FOR UPDATE USING (true);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 5. Activer le Temps Réel (Supabase Realtime)
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.products; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_notifications; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 6. Rechargement du cache de schéma
NOTIFY pgrst, 'reload schema';
