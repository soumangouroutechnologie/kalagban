-- ==============================================================================
-- Migration: Système de Livraison à Domicile Sécurisé & Assignation Coursiers
-- Date: 2026-09-03
-- ==============================================================================

-- 1. Ajout de colonnes de support pour la livraison à domicile sur orders
ALTER TABLE IF EXISTS public.orders
    ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(10),
    ADD COLUMN IF NOT EXISTS delivery_token UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS assigned_courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS courier_assigned_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS courier_delivery_notes TEXT;

-- 2. Index de performance
CREATE INDEX IF NOT EXISTS idx_orders_assigned_courier ON public.orders(assigned_courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_token ON public.orders(delivery_token);

-- 3. Fonction RPC sécurisée pour vérifier et valider l'OTP de livraison à domicile
CREATE OR REPLACE FUNCTION public.verify_home_delivery_otp(
    p_order_id UUID,
    p_otp TEXT,
    p_courier_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
BEGIN
    -- Récupérer la commande
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Commande introuvable.');
    END IF;

    -- Vérifier que la commande n'est pas annulée
    IF v_order.status = 'cancelled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cette commande a été annulée.');
    END IF;

    -- Vérifier que la commande n'est pas déjà livrée
    IF v_order.status = 'delivered' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cette commande a déjà été marquée comme livrée.');
    END IF;

    -- Vérifier le code OTP (comparaison avec pickup_code ou delivery_otp)
    IF TRIM(COALESCE(v_order.pickup_code, v_order.delivery_otp, '')) != TRIM(p_otp) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Code OTP incorrect. Veuillez demander le bon code au client.');
    END IF;

    -- Mettre à jour la commande
    UPDATE public.orders
    SET status = 'delivered',
        delivered_at = NOW(),
        relay_status = 'picked_up'
    WHERE id = p_order_id;

    -- Mettre à jour l'assignation coursier si existante
    UPDATE public.courier_assignments
    SET status = 'delivered',
        delivered_at = NOW()
    WHERE order_id = p_order_id;

    -- Incrémenter le nombre de livraisons du coursier
    IF p_courier_id IS NOT NULL THEN
        UPDATE public.couriers
        SET total_deliveries = COALESCE(total_deliveries, 0) + 1,
            status = 'available'
        WHERE id = p_courier_id;
    ELSIF v_order.assigned_courier_id IS NOT NULL THEN
        UPDATE public.couriers
        SET total_deliveries = COALESCE(total_deliveries, 0) + 1,
            status = 'available'
        WHERE id = v_order.assigned_courier_id;
    END IF;

    -- Notifications temps réel
    -- A. Client
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
            'Colis Livré avec Succès ! 🎉',
            'Votre colis Kalagban a bien été remis en main propre. Merci pour votre confiance !',
            'order'
        );
    END IF;

    -- B. Vendeur
    IF v_order.shop_id IS NOT NULL THEN
        INSERT INTO public.seller_notifications (
            shop_id,
            title,
            message,
            type,
            reference_id
        ) VALUES (
            v_order.shop_id,
            'Commande Livrée au Client 📦',
            'La commande #' || UPPER(SUBSTRING(p_order_id::text, 1, 8)) || ' a été remise au client. Le montant est crédité sur votre solde.',
            'order',
            p_order_id
        );
    END IF;

    -- C. Admin
    INSERT INTO public.admin_notifications (
        title,
        message,
        notification_type,
        target_role,
        is_broadcast
    ) VALUES (
        'Livraison à Domicile Validée',
        'La commande #' || UPPER(SUBSTRING(p_order_id::text, 1, 8)) || ' a été livrée avec succès par le coursier (Code OTP validé).',
        'info',
        'all',
        true
    );

    RETURN jsonb_build_object('success', true, 'message', 'Livraison validée avec succès !');
END;
$$;
