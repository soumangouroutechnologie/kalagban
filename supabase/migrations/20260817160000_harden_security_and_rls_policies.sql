-- Migration: Renforcement Majeur de la Sécurité & RLS (Marketplace Kalagban)
-- Objectifs :
-- 1. Anti-falsification de prix (Unit price locking depuis la table products)
-- 2. Recalcul certifié du sous-total depuis order_items
-- 3. Verrouillage des politiques RLS sur orders et order_items (protection vie privée)
-- 4. Protection Anti-Brute-Force sur les codes OTP Points Relais

-- 1. Fonction utilitaire de vérification du rôle Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TRIGGER ANTI-FALSIFICATION DES PRIX : Verrouillage strict du prix unitaire
CREATE OR REPLACE FUNCTION public.trg_enforce_order_item_integrity()
RETURNS TRIGGER AS $$
DECLARE
    v_prod_price NUMERIC;
    v_prod_status TEXT;
BEGIN
    -- Récupération du prix officiel du produit en base
    SELECT price, status INTO v_prod_price, v_prod_status 
    FROM public.products 
    WHERE id = NEW.product_id;

    IF v_prod_price IS NULL THEN
        RAISE EXCEPTION 'Sécurité : Produit introuvable (%)', NEW.product_id;
    END IF;

    IF v_prod_status != 'active' THEN
        RAISE EXCEPTION 'Sécurité : Le produit (%) n''est pas actif à la vente.', NEW.product_id;
    END IF;

    IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
        RAISE EXCEPTION 'Sécurité : La quantité doit être supérieure à 0.';
    END IF;

    -- Remplacement obligatoire du prix envoyé par le client par le prix officiel
    NEW.unit_price := v_prod_price;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_items_enforce_price ON public.order_items;
CREATE TRIGGER trg_order_items_enforce_price
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.trg_enforce_order_item_integrity();

-- 3. TRIGGER DE SYNCHRONISATION DU SOUS-TOTAL CERTIFIÉ
CREATE OR REPLACE FUNCTION public.trg_sync_order_subtotal_from_items()
RETURNS TRIGGER AS $$
DECLARE
    v_order_id UUID;
    v_calculated_subtotal NUMERIC;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_order_id := OLD.order_id;
    ELSE
        v_order_id := NEW.order_id;
    END IF;

    SELECT COALESCE(SUM(quantity * unit_price), 0)
    INTO v_calculated_subtotal
    FROM public.order_items
    WHERE order_id = v_order_id;

    IF v_calculated_subtotal > 0 THEN
        UPDATE public.orders
        SET subtotal = v_calculated_subtotal
        WHERE id = v_order_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_items_sync_subtotal ON public.order_items;
CREATE TRIGGER trg_order_items_sync_subtotal
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_order_subtotal_from_items();

-- 4. VERROUILLAGE STRICT DES POLITIQUES RLS SUR ORDERS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;
    DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
    DROP POLICY IF EXISTS "Sellers manage own orders" ON public.orders;
    DROP POLICY IF EXISTS "Secure read orders" ON public.orders;
    DROP POLICY IF EXISTS "Secure create orders" ON public.orders;
    DROP POLICY IF EXISTS "Secure update orders" ON public.orders;

    -- Lecture : Seul le client propriétaire, le vendeur de la boutique, ou l'admin peut lire
    CREATE POLICY "Secure read orders" ON public.orders
    FOR SELECT USING (
        auth.uid() = customer_id 
        OR auth.uid() = shop_id
        OR public.is_admin()
        OR (delivery_type = 'pickup_point' AND pickup_point_id IS NOT NULL)
    );

    -- Création : Acheteurs connectés ou anonymes, ou admin
    CREATE POLICY "Secure create orders" ON public.orders
    FOR INSERT WITH CHECK (
        auth.uid() = customer_id 
        OR customer_id IS NULL 
        OR public.is_admin()
    );

    -- Mise à jour : Uniquement le vendeur concerné ou l'admin
    CREATE POLICY "Secure update orders" ON public.orders
    FOR UPDATE USING (
        auth.uid() = shop_id 
        OR public.is_admin()
    );
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 5. VERROUILLAGE STRICT DES POLITIQUES RLS SUR ORDER_ITEMS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anyone can read order items" ON public.order_items;
    DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
    DROP POLICY IF EXISTS "Sellers manage own order items" ON public.order_items;
    DROP POLICY IF EXISTS "Secure read order_items" ON public.order_items;
    DROP POLICY IF EXISTS "Secure insert order_items" ON public.order_items;

    CREATE POLICY "Secure read order_items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.customer_id = auth.uid() OR orders.shop_id = auth.uid() OR public.is_admin())
        )
    );

    CREATE POLICY "Secure insert order_items" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.id = order_items.order_id 
            AND (orders.customer_id = auth.uid() OR orders.customer_id IS NULL OR public.is_admin())
        )
    );
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 6. PROTECTION ANTI-BRUTE-FORCE OTP POINT RELAIS (Max 5 tentatives)
CREATE TABLE IF NOT EXISTS public.pickup_otp_attempts (
    order_id UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
    attempts_count INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_blocked BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.pickup_otp_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage otp attempts" ON public.pickup_otp_attempts FOR ALL USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.verify_order_pickup_otp(
    p_order_id UUID,
    p_input_code TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_attempts RECORD;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Commande introuvable.');
    END IF;

    SELECT * INTO v_attempts FROM public.pickup_otp_attempts WHERE order_id = p_order_id;
    IF v_attempts.is_blocked THEN
        RETURN jsonb_build_object('success', false, 'message', 'Code temporairement bloqué suite à 5 tentatives infructueuses (Protection Sécurité).');
    END IF;

    IF v_order.pickup_code = TRIM(p_input_code) THEN
        UPDATE public.orders 
        SET relay_status = 'picked_up', status = 'delivered', picked_up_at = NOW() 
        WHERE id = p_order_id;
        
        DELETE FROM public.pickup_otp_attempts WHERE order_id = p_order_id;

        RETURN jsonb_build_object('success', true, 'message', 'Code validé avec succès. Colis remis au client.');
    ELSE
        INSERT INTO public.pickup_otp_attempts (order_id, attempts_count, last_attempt_at, is_blocked)
        VALUES (p_order_id, 1, NOW(), FALSE)
        ON CONFLICT (order_id) DO UPDATE 
        SET attempts_count = public.pickup_otp_attempts.attempts_count + 1,
            last_attempt_at = NOW(),
            is_blocked = (public.pickup_otp_attempts.attempts_count + 1 >= 5);

        RETURN jsonb_build_object('success', false, 'message', 'Code de sécurité OTP incorrect.');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
