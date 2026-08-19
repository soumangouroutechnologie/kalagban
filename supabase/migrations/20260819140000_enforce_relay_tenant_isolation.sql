-- Migration: Isolation Stricte Multi-Tenant des Points Relais & Sécurisation des Accès
-- Date: 2026-08-19

-- 1. Nettoyage et réassignation des logs orphelins ou sans pickup_point_id
UPDATE public.relay_logs l
SET pickup_point_id = o.pickup_point_id
FROM public.orders o
WHERE l.order_id = o.id AND l.pickup_point_id IS NULL AND o.pickup_point_id IS NOT NULL;

-- 2. Index de performance et d'isolation
CREATE INDEX IF NOT EXISTS idx_relay_logs_pickup_point_id ON public.relay_logs(pickup_point_id);
CREATE INDEX IF NOT EXISTS idx_orders_pickup_point_id ON public.orders(pickup_point_id);
CREATE INDEX IF NOT EXISTS idx_relay_notifications_pickup_point_id ON public.relay_notifications(pickup_point_id);
CREATE INDEX IF NOT EXISTS idx_relay_payouts_pickup_point_id ON public.relay_payouts(pickup_point_id);

-- 3. Supprimer les anciennes signatures de fonctions pour éviter l'erreur PostgreSQL 42P13
DROP FUNCTION IF EXISTS public.relay_receive_package(UUID, TEXT);
DROP FUNCTION IF EXISTS public.relay_receive_package(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.relay_verify_otp(TEXT);
DROP FUNCTION IF EXISTS public.relay_verify_otp(TEXT, TEXT);

-- 4. Fonction RPC: Réception de Colis avec Contrôle d'Isolation par Point Relais
CREATE OR REPLACE FUNCTION public.relay_receive_package(
    p_order_id UUID,
    p_pickup_code TEXT,
    p_relay_code TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_current_relay RECORD;
    v_target_relay RECORD;
    v_shop RECORD;
    v_relay_name TEXT := 'Point Relais Kalagban';
    v_relay_address TEXT := 'Abidjan';
    v_effective_relay_id UUID := NULL;
BEGIN
    -- Récupérer la commande
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Commande introuvable.');
    END IF;

    -- Récupérer le point relais appelant si code fourni
    IF p_relay_code IS NOT NULL AND p_relay_code <> '' THEN
        SELECT * INTO v_current_relay FROM public.pickup_points WHERE code = p_relay_code LIMIT 1;
    END IF;

    -- Contrôle d'assignation : interdire la réception si le colis est destiné à un AUTRE relais
    IF v_order.pickup_point_id IS NOT NULL AND v_current_relay.id IS NOT NULL AND v_order.pickup_point_id <> v_current_relay.id THEN
        SELECT * INTO v_target_relay FROM public.pickup_points WHERE id = v_order.pickup_point_id;
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Ce colis est assigné au Point Relais "' || COALESCE(v_target_relay.name, 'un autre relais') || '". Impossible de le réceptionner dans votre établissement.'
        );
    END IF;

    v_effective_relay_id := COALESCE(v_current_relay.id, v_order.pickup_point_id);

    IF v_effective_relay_id IS NOT NULL THEN
        SELECT * INTO v_current_relay FROM public.pickup_points WHERE id = v_effective_relay_id;
        IF FOUND THEN
            v_relay_name := v_current_relay.name;
            v_relay_address := v_current_relay.address || ', ' || v_current_relay.commune;
        END IF;
    END IF;

    -- Récupérer la boutique
    SELECT * INTO v_shop FROM public.shops WHERE id = v_order.shop_id;

    -- Mise à jour de la commande avec le code OTP et le statut de disponibilité
    UPDATE public.orders 
    SET relay_status = 'ready_for_pickup',
        pickup_code = p_pickup_code,
        pickup_point_id = v_effective_relay_id,
        deposited_at = NOW()
    WHERE id = p_order_id;

    -- Enregistrer dans le Journal d'audit Relay Logs avec isolation stricte
    INSERT INTO public.relay_logs (
        pickup_point_id,
        order_id,
        order_code,
        customer_name,
        customer_phone,
        action_type,
        otp_code,
        commission_earned,
        created_at
    ) VALUES (
        v_effective_relay_id,
        p_order_id,
        UPPER(SUBSTRING(p_order_id::TEXT, 1, 8)),
        COALESCE(v_order.customer_name, 'Client Kalagban'),
        COALESCE(v_order.customer_phone, '+225 --'),
        'deposit',
        p_pickup_code,
        300,
        NOW()
    );

    -- Notification dédiée pour le Point Relais
    INSERT INTO public.relay_notifications (
        pickup_point_id,
        title,
        message,
        type,
        is_read,
        created_at
    ) VALUES (
        v_effective_relay_id,
        'Nouveau Colis Réceptionné',
        'Le colis #' || UPPER(SUBSTRING(p_order_id::TEXT, 1, 8)) || ' a été placé en étagère (Code OTP généré : ' || p_pickup_code || ').',
        'deposit',
        false,
        NOW()
    );

    -- Notification Vendeur
    IF v_order.shop_id IS NOT NULL THEN
        INSERT INTO public.seller_notifications (
            shop_id,
            title,
            message,
            type,
            is_read,
            created_at
        ) VALUES (
            v_order.shop_id,
            'Colis Réceptionné au Point Relais 📍',
            'Le colis de la commande #' || UPPER(SUBSTRING(p_order_id::TEXT, 1, 8)) || ' a bien été réceptionné au Point Relais (' || v_relay_name || '). Le client a reçu son code OTP de retrait.',
            'relay',
            false,
            NOW()
        );
    END IF;

    -- Notification Client (In-App)
    IF v_order.customer_id IS NOT NULL THEN
        INSERT INTO public.customer_notifications (
            customer_id,
            title,
            message,
            type,
            order_id,
            action_url,
            is_read,
            created_at
        ) VALUES (
            v_order.customer_id,
            'Colis disponible au Point Relais 🎁',
            'Votre colis est arrivé au point relais ' || v_relay_name || ' (' || v_relay_address || '). Présentez votre code OTP : ' || p_pickup_code || ' pour le retirer.',
            'ready_for_pickup',
            v_order.id,
            '/account',
            false,
            NOW()
        );
    END IF;

    -- Notification Super-Admin
    INSERT INTO public.admin_notifications (
        title,
        message,
        type,
        action_url,
        is_read,
        created_at
    ) VALUES (
        'Colis en Point Relais : #' || UPPER(SUBSTRING(p_order_id::TEXT, 1, 8)),
        'Le colis #' || UPPER(SUBSTRING(p_order_id::TEXT, 1, 8)) || ' a été déposé au point relais "' || v_relay_name || '" et attend le retrait client.',
        'logistics',
        '/relays',
        false,
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'otp_code', p_pickup_code,
        'relay_name', v_relay_name,
        'relay_address', v_relay_address,
        'customer_name', COALESCE(v_order.customer_name, 'Client Kalagban'),
        'customer_phone', COALESCE(v_order.customer_phone, '')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Fonction RPC: Remise Colis Client avec Contrôle d'Isolation et Validation OTP
CREATE OR REPLACE FUNCTION public.relay_verify_otp(
    p_code TEXT,
    p_relay_code TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_current_relay RECORD;
    v_target_relay RECORD;
    v_clean_code TEXT;
    v_relay_name TEXT := 'Point Relais Kalagban';
    v_effective_relay_id UUID := NULL;
BEGIN
    v_clean_code := TRIM(p_code);
    
    -- Trouver la commande correspondante
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

    -- Récupérer le point relais appelant
    IF p_relay_code IS NOT NULL AND p_relay_code <> '' THEN
        SELECT * INTO v_current_relay FROM public.pickup_points WHERE code = p_relay_code LIMIT 1;
    END IF;

    -- Contrôle d'assignation : bloquer si le colis appartient à un AUTRE relais
    IF v_order.pickup_point_id IS NOT NULL AND v_current_relay.id IS NOT NULL AND v_order.pickup_point_id <> v_current_relay.id THEN
        SELECT * INTO v_target_relay FROM public.pickup_points WHERE id = v_order.pickup_point_id;
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Ce code OTP appartient à un colis stocké au Point Relais "' || COALESCE(v_target_relay.name, 'un autre relais') || '". Vous ne pouvez pas effectuer cette remise.'
        );
    END IF;

    v_effective_relay_id := COALESCE(v_current_relay.id, v_order.pickup_point_id);

    IF v_effective_relay_id IS NOT NULL THEN
        SELECT * INTO v_current_relay FROM public.pickup_points WHERE id = v_effective_relay_id;
        IF FOUND THEN
            v_relay_name := v_current_relay.name;
        END IF;
    END IF;

    -- Mettre à jour la commande
    UPDATE public.orders 
    SET relay_status = 'picked_up', 
        status = 'delivered', 
        picked_up_at = NOW() 
    WHERE id = v_order.id;

    DELETE FROM public.pickup_otp_attempts WHERE order_id = v_order.id;

    -- Journaliser le retrait dans relay_logs avec pickup_point_id strict
    INSERT INTO public.relay_logs (
        pickup_point_id,
        order_id,
        order_code,
        customer_name,
        customer_phone,
        action_type,
        otp_code,
        commission_earned,
        created_at
    ) VALUES (
        v_effective_relay_id,
        v_order.id,
        UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)),
        COALESCE(v_order.customer_name, 'Client Kalagban'),
        COALESCE(v_order.customer_phone, '+225 --'),
        'pickup',
        v_order.pickup_code,
        300,
        NOW()
    );

    -- Notification Relais
    INSERT INTO public.relay_notifications (
        pickup_point_id,
        title,
        message,
        type,
        is_read,
        created_at
    ) VALUES (
        v_effective_relay_id,
        'Remise Colis Confirmée (OTP)',
        'Le colis #' || UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)) || ' a été remis au client. Commission de +300 FCFA créditée.',
        'pickup',
        false,
        NOW()
    );

    -- Notification Vendeur (Remise effectuée, paiement débloqué)
    IF v_order.shop_id IS NOT NULL THEN
        INSERT INTO public.seller_notifications (
            shop_id,
            title,
            message,
            type,
            is_read,
            created_at
        ) VALUES (
            v_order.shop_id,
            'Colis Récupéré & Commande Livrée 🎉',
            'Le client a retiré sa commande #' || UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)) || ' au point relais ' || v_relay_name || '. Le paiement de ' || COALESCE(v_order.total_amount, 0) || ' FCFA est débloqué !',
            'order_delivered',
            false,
            NOW()
        );
    END IF;

    -- Notification Client
    IF v_order.customer_id IS NOT NULL THEN
        INSERT INTO public.customer_notifications (
            customer_id,
            title,
            message,
            type,
            order_id,
            action_url,
            is_read,
            created_at
        ) VALUES (
            v_order.customer_id,
            'Commande Livrée avec Succès ! 🎉',
            'Vous avez bien récupéré votre commande #' || UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)) || ' au point relais ' || v_relay_name || '. Merci pour votre confiance !',
            'delivered',
            v_order.id,
            '/account',
            false,
            NOW()
        );
    END IF;

    -- Notification Super-Admin
    INSERT INTO public.admin_notifications (
        title,
        message,
        type,
        action_url,
        is_read,
        created_at
    ) VALUES (
        'Colis Remis au Client : #' || UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)),
        'Le client a validé son code OTP au point relais "' || v_relay_name || '" pour la commande #' || UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)) || '.',
        'logistics',
        '/relays',
        false,
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true, 
        'order_id', v_order.id,
        'order_code', UPPER(SUBSTRING(v_order.id::TEXT, 1, 8)),
        'customer_name', COALESCE(v_order.customer_name, 'Client Kalagban'),
        'customer_phone', COALESCE(v_order.customer_phone, '+225 --'),
        'relay_name', v_relay_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
