-- Migration: Correction Sécurisée du Workflow Point Relais (Réception Étagère, RLS & Validation OTP)
-- Date: 2026-08-19

-- 1. Fonction RPC SECURITY DEFINER pour la mise en étagère sécurisée par le Point Relais
CREATE OR REPLACE FUNCTION public.relay_receive_package(
    p_order_id UUID,
    p_pickup_code TEXT DEFAULT NULL,
    p_relay_code TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_otp TEXT;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Commande introuvable.');
    END IF;

    -- Conserver le code OTP existant ou utiliser celui fourni
    v_otp := COALESCE(NULLIF(TRIM(p_pickup_code), ''), v_order.pickup_code, floor(100000 + random() * 900000)::TEXT);

    UPDATE public.orders 
    SET relay_status = 'ready_for_pickup',
        deposited_at = NOW(),
        pickup_code = v_otp
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Colis réceptionné avec succès en étagère.',
        'pickup_code', v_otp
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fonction RPC SECURITY DEFINER universelle pour validation du retrait client par OTP ou Réf Commande
CREATE OR REPLACE FUNCTION public.relay_verify_otp(
    p_code TEXT,
    p_relay_code TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_clean_code TEXT;
BEGIN
    v_clean_code := TRIM(p_code);
    
    -- Chercher par code OTP direct ou par ID de commande (insensible à la casse / préfixe)
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

    -- Mettre à jour la commande au statut Livré et Colis retiré
    UPDATE public.orders 
    SET relay_status = 'picked_up', 
        status = 'delivered', 
        picked_up_at = NOW() 
    WHERE id = v_order.id;

    -- Nettoyer d'éventuelles tentatives bloquées
    DELETE FROM public.pickup_otp_attempts WHERE order_id = v_order.id;

    -- Enregistrer l'historique dans relay_logs
    INSERT INTO public.relay_logs (
        order_id, 
        order_code, 
        customer_name, 
        customer_phone, 
        action_type, 
        otp_code, 
        commission_earned
    ) VALUES (
        v_order.id, 
        UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)), 
        v_order.customer_name, 
        v_order.customer_phone, 
        'pickup', 
        v_order.pickup_code, 
        300
    );

    -- Notification opérationnelle
    INSERT INTO public.relay_notifications (
        title, 
        message, 
        type
    ) VALUES (
        'Remise Client Confirmée', 
        'Le colis #' || UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)) || ' a été remis au client ' || COALESCE(v_order.customer_name, 'Client') || '. Commission de +300 FCFA créditée !', 
        'pickup'
    );

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Code validé avec succès. Colis remis au client.',
        'order_id', v_order.id,
        'customer_name', v_order.customer_name,
        'customer_phone', v_order.customer_phone,
        'order_code', UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)),
        'total_amount', v_order.total_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Mise à jour de la politique RLS sur orders pour autoriser explicitement les mises à jour des colis en Point Relais
DO $$
BEGIN
    DROP POLICY IF EXISTS "Secure update orders" ON public.orders;
    CREATE POLICY "Secure update orders" ON public.orders
    FOR UPDATE USING (
        auth.uid() = shop_id 
        OR public.is_admin()
        OR delivery_type = 'pickup_point'
    );
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 4. Attribution des permissions d'exécution
GRANT EXECUTE ON FUNCTION public.relay_receive_package TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.relay_verify_otp TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_order_pickup_otp TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
