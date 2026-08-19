-- Migration: Tables et Fonctions de Notifications Multi-Profils en Temps Réel
-- Date: 2026-08-19

-- 1. Table des notifications pour les clients / acheteurs
CREATE TABLE IF NOT EXISTS public.customer_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'order' CHECK (type IN ('order', 'delivery', 'pickup', 'system', 'promo')),
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index pour performance des requêtes par client
CREATE INDEX IF NOT EXISTS idx_customer_notifications_customer ON public.customer_notifications(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_notifications_order ON public.customer_notifications(order_id);

-- Activation de RLS sur customer_notifications
ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Customers read own notifications" ON public.customer_notifications;
    DROP POLICY IF EXISTS "Public insert notifications" ON public.customer_notifications;
    DROP POLICY IF EXISTS "Customers update own notifications" ON public.customer_notifications;

    CREATE POLICY "Customers read own notifications" ON public.customer_notifications
        FOR SELECT USING (auth.uid() = customer_id OR auth.uid() IS NULL OR public.is_admin());

    CREATE POLICY "Public insert notifications" ON public.customer_notifications
        FOR INSERT WITH CHECK (true);

    CREATE POLICY "Customers update own notifications" ON public.customer_notifications
        FOR UPDATE USING (auth.uid() = customer_id OR auth.uid() IS NULL OR public.is_admin());
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Publication Supabase Realtime pour écoute en direct
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_notifications;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_notifications;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.relay_notifications;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. Mise à jour de la fonction RPC relay_receive_package avec dispatching multi-profils
CREATE OR REPLACE FUNCTION public.relay_receive_package(
    p_order_id UUID,
    p_pickup_code TEXT DEFAULT NULL,
    p_relay_code TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_relay RECORD;
    v_shop RECORD;
    v_otp TEXT;
    v_relay_name TEXT := 'Point Relais Kalagban';
BEGIN
    -- 1. Récupération de la commande
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Commande introuvable.');
    END IF;

    -- 2. Récupération du Point Relais
    IF v_order.pickup_point_id IS NOT NULL THEN
        SELECT * INTO v_relay FROM public.pickup_points WHERE id = v_order.pickup_point_id;
        IF FOUND THEN
            v_relay_name := v_relay.name;
        END IF;
    ELSIF p_relay_code IS NOT NULL THEN
        SELECT * INTO v_relay FROM public.pickup_points WHERE code = p_relay_code LIMIT 1;
        IF FOUND THEN
            v_relay_name := v_relay.name;
            UPDATE public.orders SET pickup_point_id = v_relay.id WHERE id = p_order_id;
        END IF;
    END IF;

    -- 3. Récupération de la Boutique Vendeuse
    SELECT * INTO v_shop FROM public.shops WHERE id = v_order.shop_id;

    -- 4. Attribution ou génération de l'OTP
    v_otp := COALESCE(NULLIF(TRIM(p_pickup_code), ''), v_order.pickup_code, floor(100000 + random() * 900000)::TEXT);

    -- 5. Mise à jour de la commande
    UPDATE public.orders 
    SET relay_status = 'ready_for_pickup',
        deposited_at = NOW(),
        pickup_code = v_otp
    WHERE id = p_order_id;

    -- 6. DISPATCHING DES NOTIFICATIONS :

    -- A. Notification Vendeur
    IF v_order.shop_id IS NOT NULL THEN
        INSERT INTO public.seller_notifications (
            shop_id,
            title,
            message,
            type,
            reference_id
        ) VALUES (
            v_order.shop_id,
            'Colis Réceptionné au Point Relais 📍',
            'Le colis de la commande #' || UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)) || ' a bien été réceptionné par le ' || v_relay_name || ' et est disponible pour le client.',
            'order',
            v_order.id
        );
    END IF;

    -- B. Notification Client (In-App)
    IF v_order.customer_id IS NOT NULL THEN
        INSERT INTO public.customer_notifications (
            customer_id,
            order_id,
            title,
            message,
            type
        ) VALUES (
            v_order.customer_id,
            v_order.id,
            'Votre colis est disponible au Point Relais ! 📍',
            'Votre commande #' || UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)) || ' vous attend au ' || v_relay_name || '. Présentez votre code OTP : ' || v_otp,
            'pickup'
        );
    END IF;

    -- C. Notification Super-Admin & Responsable Logistique
    INSERT INTO public.admin_notifications (
        title,
        message,
        notification_type,
        target_role,
        is_broadcast
    ) VALUES (
        'Colis en Stock Relais',
        'Commande #' || UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)) || ' réceptionnée avec succès au ' || v_relay_name || ' (Client: ' || COALESCE(v_order.customer_name, 'Client') || ').',
        'info',
        'all',
        true
    );

    -- D. Log Opérationnel Point Relais
    INSERT INTO public.relay_logs (
        pickup_point_id,
        order_id,
        order_code,
        customer_name,
        customer_phone,
        action_type,
        otp_code,
        commission_earned
    ) VALUES (
        COALESCE(v_order.pickup_point_id, v_relay.id),
        v_order.id,
        UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)),
        v_order.customer_name,
        v_order.customer_phone,
        'deposit',
        v_otp,
        300
    );

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Colis réceptionné avec succès en étagère.',
        'pickup_code', v_otp,
        'order_id', v_order.id,
        'customer_name', v_order.customer_name,
        'customer_phone', v_order.customer_phone,
        'customer_id', v_order.customer_id,
        'relay_name', v_relay_name,
        'relay_address', COALESCE(v_relay.address, ''),
        'relay_commune', COALESCE(v_relay.commune, ''),
        'shop_name', v_shop.name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Mise à jour de la fonction RPC relay_verify_otp avec dispatching multi-profils
CREATE OR REPLACE FUNCTION public.relay_verify_otp(
    p_code TEXT,
    p_relay_code TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_relay RECORD;
    v_shop RECORD;
    v_clean_code TEXT;
    v_relay_name TEXT := 'Point Relais Kalagban';
BEGIN
    v_clean_code := TRIM(p_code);
    
    SELECT * INTO v_order 
    FROM public.orders 
    WHERE pickup_code = v_clean_code 
       OR id::TEXT ILIKE (v_clean_code || '%')
       OR UPPER(id::TEXT) ILIKE (UPPER(v_clean_code) || '%')
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Code OTP ou numéro de colis introuvable.');
    END IF;

    -- Récupérer le Point Relais
    IF v_order.pickup_point_id IS NOT NULL THEN
        SELECT * INTO v_relay FROM public.pickup_points WHERE id = v_order.pickup_point_id;
        IF FOUND THEN
            v_relay_name := v_relay.name;
        END IF;
    END IF;

    -- Récupérer la Boutique
    SELECT * INTO v_shop FROM public.shops WHERE id = v_order.shop_id;

    -- Mise à jour de la commande
    UPDATE public.orders 
    SET relay_status = 'picked_up', 
        status = 'delivered', 
        picked_up_at = NOW() 
    WHERE id = v_order.id;

    DELETE FROM public.pickup_otp_attempts WHERE order_id = v_order.id;

    -- DISPATCHING DES NOTIFICATIONS :

    -- A. Notification Vendeur (Remise effectuée, paiement débloqué)
    IF v_order.shop_id IS NOT NULL THEN
        INSERT INTO public.seller_notifications (
            shop_id,
            title,
            message,
            type,
            reference_id
        ) VALUES (
            v_order.shop_id,
            'Commande Livrée avec Succès 🎉',
            'Le colis de la commande #' || UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)) || ' a été remis au client ' || COALESCE(v_order.customer_name, '') || ' avec validation du Code OTP. Vos gains sont confirmés.',
            'order',
            v_order.id
        );
    END IF;

    -- B. Notification Client (In-App)
    IF v_order.customer_id IS NOT NULL THEN
        INSERT INTO public.customer_notifications (
            customer_id,
            order_id,
            title,
            message,
            type
        ) VALUES (
            v_order.customer_id,
            v_order.id,
            'Commande Récupérée avec Succès ! 🎉',
            'Votre commande #' || UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)) || ' a bien été retirée au ' || v_relay_name || '. Merci de votre confiance !',
            'delivery'
        );
    END IF;

    -- C. Notification Super-Admin
    INSERT INTO public.admin_notifications (
        title,
        message,
        notification_type,
        target_role,
        is_broadcast
    ) VALUES (
        'Retrait Colis Confirmé (OTP)',
        'Commande #' || UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)) || ' remise avec succès à ' || COALESCE(v_order.customer_name, 'Client') || ' au ' || v_relay_name || '. Commission relais de +300 FCFA validée.',
        'info',
        'all',
        true
    );

    -- D. Log Opérationnel Point Relais
    INSERT INTO public.relay_logs (
        pickup_point_id,
        order_id, 
        order_code, 
        customer_name, 
        customer_phone, 
        action_type, 
        otp_code, 
        commission_earned
    ) VALUES (
        COALESCE(v_order.pickup_point_id, v_relay.id),
        v_order.id, 
        UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)), 
        v_order.customer_name, 
        v_order.customer_phone, 
        'pickup', 
        v_order.pickup_code, 
        300
    );

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Code validé avec succès. Colis remis au client.',
        'order_id', v_order.id,
        'customer_name', v_order.customer_name,
        'customer_phone', v_order.customer_phone,
        'order_code', UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)),
        'total_amount', v_order.total_amount,
        'relay_name', v_relay_name,
        'shop_name', v_shop.name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.relay_receive_package TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.relay_verify_otp TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
