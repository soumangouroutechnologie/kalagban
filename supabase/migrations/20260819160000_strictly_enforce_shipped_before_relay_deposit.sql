-- Migration: Strictly enforce that orders must be SHIPPED before point relais can deposit in stock
-- Prevents point relais from depositing packages that are still 'pending' or 'processing' at the merchant shop

DROP FUNCTION IF EXISTS public.relay_receive_package(UUID, TEXT);
DROP FUNCTION IF EXISTS public.relay_receive_package(UUID, TEXT, TEXT);

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
    v_status_label TEXT;
BEGIN
    -- 1. Récupérer la commande
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Commande introuvable.');
    END IF;

    -- 2. Récupérer le point relais appelant si code fourni
    IF p_relay_code IS NOT NULL AND p_relay_code <> '' THEN
        SELECT * INTO v_current_relay FROM public.pickup_points WHERE code = p_relay_code LIMIT 1;
    END IF;

    -- 3. Contrôle d'assignation : interdire la réception si le colis est destiné à un AUTRE relais
    IF v_order.pickup_point_id IS NOT NULL AND v_current_relay.id IS NOT NULL AND v_order.pickup_point_id <> v_current_relay.id THEN
        SELECT * INTO v_target_relay FROM public.pickup_points WHERE id = v_order.pickup_point_id;
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'Ce colis est assigné au Point Relais "' || COALESCE(v_target_relay.name, 'un autre relais') || '". Impossible de le réceptionner dans votre établissement.'
        );
    END IF;

    -- 4. CONTRÔLE CRITIQUE D'EXPÉDITION PAR LE MARCHAND :
    -- Le colis NE DOIT PAS pouvoir être mis en étagère s'il est encore chez le vendeur (pending / processing)
    IF v_order.status IS NULL OR v_order.status NOT IN ('shipped', 'in_transit') THEN
        IF v_order.status = 'pending' THEN
            v_status_label := 'En attente de confirmation marchand';
        ELSIF v_order.status = 'processing' OR v_order.status = 'preparing' THEN
            v_status_label := 'En cours de préparation / emballage chez le vendeur';
        ELSE
            v_status_label := COALESCE(v_order.status, 'Inconnu');
        END IF;

        RETURN jsonb_build_object(
            'success', false,
            'message', '⛔ Impossible de réceptionner ce colis : Le vendeur n''a pas encore remis le colis au coursier (Statut actuel : ' || v_status_label || '). La réception en point relais ne sera autorisée qu''une fois le colis expédié.'
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

    -- 5. Mise à jour de la commande avec le statut de disponibilité
    UPDATE public.orders 
    SET relay_status = 'ready_for_pickup',
        pickup_code = p_pickup_code,
        pickup_point_id = v_effective_relay_id,
        deposited_at = NOW()
    WHERE id = p_order_id;

    -- 6. Enregistrer dans le Journal d'audit Relay Logs
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
        v_effective_relay_id,
        v_order.id,
        COALESCE(v_order.id::text, substring(p_order_id::text from 1 for 8)),
        COALESCE(v_order.customer_name, 'Client Kalagban'),
        COALESCE(v_order.customer_phone, '+225 --'),
        'deposit',
        p_pickup_code,
        300
    );

    -- 7. Notifications internes
    IF v_effective_relay_id IS NOT NULL THEN
        INSERT INTO public.relay_notifications (
            pickup_point_id,
            title,
            message,
            type
        ) VALUES (
            v_effective_relay_id,
            'Colis Réceptionné en Étagère',
            'Le colis de la commande #' || substring(p_order_id::text from 1 for 8) || ' a été réceptionné du coursier et placé en étagère.',
            'deposit'
        );
    END IF;

    IF v_order.customer_id IS NOT NULL THEN
        INSERT INTO public.customer_notifications (
            customer_id,
            order_id,
            title,
            message,
            type
        ) VALUES (
            v_order.customer_id,
            p_order_id,
            'Votre colis est arrivé au Point Relais ! 📍',
            'Votre commande est disponible au point relais "' || v_relay_name || '" (' || v_relay_address || '). Présentez votre code secret OTP : ' || p_pickup_code || ' pour la retirer.',
            'pickup'
        );
    END IF;

    IF v_order.shop_id IS NOT NULL THEN
        INSERT INTO public.seller_notifications (
            shop_id,
            reference_id,
            title,
            message,
            type
        ) VALUES (
            v_order.shop_id,
            p_order_id,
            'Colis Livré au Point Relais 📍',
            'Le colis #' || substring(p_order_id::text from 1 for 8) || ' a bien été acheminé et stocké au Point Relais ' || v_relay_name || '.',
            'order'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Colis réceptionné avec succès et placé en étagère. Code OTP activé pour le client.',
        'order_id', v_order.id,
        'order_code', substring(p_order_id::text from 1 for 8),
        'customer_name', v_order.customer_name,
        'customer_phone', v_order.customer_phone,
        'pickup_code', p_pickup_code,
        'relay_name', v_relay_name,
        'relay_address', v_relay_address,
        'shop_name', COALESCE(v_shop.name, 'Boutique Kalagban')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.relay_receive_package(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.relay_receive_package(UUID, TEXT) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
