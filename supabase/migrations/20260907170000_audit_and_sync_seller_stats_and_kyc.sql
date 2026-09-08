-- Migration: Audit, synchronisation et vues d'aide pour les statistiques vendeurs et le KYC
-- Date: 7 Septembre 2026

-- ==============================================================================
-- 1. VÉRIFICATION & SÉCURISATION DES POLITIQUES RLS SUR LES CERTIFICATIONS KYC
-- ==============================================================================
ALTER TABLE public.seller_certifications ENABLE ROW LEVEL SECURITY;

-- Permettre aux vendeurs de lire leur propre dossier KYC
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'seller_certifications' AND policyname = 'Sellers can view own certification'
    ) THEN
        CREATE POLICY "Sellers can view own certification" 
        ON public.seller_certifications 
        FOR SELECT 
        USING (auth.uid() = shop_id);
    END IF;
END $$;

-- Permettre aux vendeurs de créer/mettre à jour leur dossier KYC
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'seller_certifications' AND policyname = 'Sellers can insert own certification'
    ) THEN
        CREATE POLICY "Sellers can insert own certification" 
        ON public.seller_certifications 
        FOR INSERT 
        WITH CHECK (auth.uid() = shop_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'seller_certifications' AND policyname = 'Sellers can update own certification'
    ) THEN
        CREATE POLICY "Sellers can update own certification" 
        ON public.seller_certifications 
        FOR UPDATE 
        USING (auth.uid() = shop_id);
    END IF;
END $$;

-- ==============================================================================
-- 2. FONCTION SQL D'AUDIT : CALCUL DES STATISTIQUES & PORTEFEUILLE D'UNE BOUTIQUE
-- ==============================================================================
-- Cette fonction permet de calculer avec exactitude le solde et les ventes d'une boutique
CREATE OR REPLACE FUNCTION public.get_seller_financial_summary(p_shop_id UUID)
RETURNS TABLE (
    total_gross_sales NUMERIC,
    delivered_gross_sales NUMERIC,
    intransit_gross_sales NUMERIC,
    commission_kalagban_5pct NUMERIC,
    net_available_before_payouts NUMERIC,
    total_payouts_processed NUMERIC,
    solde_disponible_retrait NUMERIC,
    solde_en_cours NUMERIC,
    total_articles_vendus BIGINT,
    total_commandes_valides BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_sales NUMERIC := 0;
    v_delivered_gross NUMERIC := 0;
    v_intransit_gross NUMERIC := 0;
    v_payouts NUMERIC := 0;
    v_items_count BIGINT := 0;
    v_orders_count BIGINT := 0;
    v_commission_rate NUMERIC := 0.05;
    v_net_delivered NUMERIC := 0;
    v_avail NUMERIC := 0;
    v_pending NUMERIC := 0;
BEGIN
    -- 1. Calcul des ventes par statut de commande (en excluant les commandes annulées)
    SELECT 
        COALESCE(SUM(COALESCE(subtotal, total_amount, 0)), 0),
        COALESCE(SUM(CASE WHEN status IN ('delivered', 'picked_up') THEN COALESCE(subtotal, total_amount, 0) ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status NOT IN ('cancelled', 'delivered', 'picked_up') THEN COALESCE(subtotal, total_amount, 0) ELSE 0 END), 0),
        COUNT(id)
    INTO 
        v_total_sales,
        v_delivered_gross,
        v_intransit_gross,
        v_orders_count
    FROM public.orders
    WHERE shop_id = p_shop_id
      AND status != 'cancelled';

    -- 2. Somme des virements / retraits demandés ou payés
    SELECT 
        COALESCE(SUM(amount), 0)
    INTO 
        v_payouts
    FROM public.payouts
    WHERE shop_id = p_shop_id
      AND status IN ('processed', 'pending');

    -- 3. Somme des articles vendus
    SELECT 
        COALESCE(SUM(oi.quantity), 0)
    INTO 
        v_items_count
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.shop_id = p_shop_id
      AND o.status != 'cancelled';

    -- 4. Calculs des soldes nets
    v_net_delivered := ROUND(v_delivered_gross * (1.0 - v_commission_rate));
    v_avail := GREATEST(0, v_net_delivered - v_payouts);
    v_pending := ROUND(v_intransit_gross * (1.0 - v_commission_rate));

    RETURN QUERY SELECT 
        v_total_sales,
        v_delivered_gross,
        v_intransit_gross,
        ROUND(v_delivered_gross * v_commission_rate),
        v_net_delivered,
        v_payouts,
        v_avail,
        v_pending,
        v_items_count,
        v_orders_count;
END;
$$;
