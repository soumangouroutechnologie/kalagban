-- 1. Table des Coursiers / Livreurs (couriers)
CREATE TABLE IF NOT EXISTS public.couriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    secondary_phone VARCHAR(50),
    photo_url TEXT,
    vehicle_type VARCHAR(50) DEFAULT 'moto',
    license_plate VARCHAR(50),
    coverage_type VARCHAR(50) DEFAULT 'all_abidjan',
    preferred_communes JSONB DEFAULT '[]'::jsonb,
    preferred_zone VARCHAR(100) DEFAULT 'Abidjan',
    id_card_type VARCHAR(50) DEFAULT 'cni',
    id_card_number VARCHAR(100),
    id_card_front_url TEXT,
    id_card_back_url TEXT,
    is_partner_company BOOLEAN DEFAULT false,
    company_name VARCHAR(255),
    company_manager VARCHAR(255),
    company_phone VARCHAR(50),
    registered_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'available',
    rating NUMERIC(3, 2) DEFAULT 5.00,
    total_deliveries INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT true,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    terms_accepted BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ajouter toutes les colonnes manquantes si la table existait déjà
ALTER TABLE public.couriers 
    ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS photo_url TEXT,
    ADD COLUMN IF NOT EXISTS coverage_type VARCHAR(50) DEFAULT 'all_abidjan',
    ADD COLUMN IF NOT EXISTS preferred_communes JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS id_card_type VARCHAR(50) DEFAULT 'cni',
    ADD COLUMN IF NOT EXISTS id_card_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS id_card_front_url TEXT,
    ADD COLUMN IF NOT EXISTS id_card_back_url TEXT,
    ADD COLUMN IF NOT EXISTS is_partner_company BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS company_manager VARCHAR(255),
    ADD COLUMN IF NOT EXISTS company_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS registered_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT true;

-- 2. Table des Assignations de Courses (courier_assignments)
CREATE TABLE IF NOT EXISTS public.courier_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_id UUID NOT NULL REFERENCES public.couriers(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    origin_address TEXT,
    destination_address TEXT,
    status VARCHAR(50) DEFAULT 'assigned', -- assigned, accepted, in_transit, delivered, failed, cancelled
    notes TEXT,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Colonnes de support sur la table orders
ALTER TABLE IF EXISTS public.orders
    ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(50) DEFAULT 'pickup_point',
    ADD COLUMN IF NOT EXISTS pickup_code VARCHAR(10),
    ADD COLUMN IF NOT EXISTS delivery_otp VARCHAR(10),
    ADD COLUMN IF NOT EXISTS delivery_token UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS assigned_courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS courier_assigned_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS courier_delivery_notes TEXT;

-- 4. Index de performance
CREATE INDEX IF NOT EXISTS idx_couriers_phone ON public.couriers(phone);
CREATE INDEX IF NOT EXISTS idx_couriers_status ON public.couriers(status);
CREATE INDEX IF NOT EXISTS idx_courier_assignments_order ON public.courier_assignments(order_id);
CREATE INDEX IF NOT EXISTS idx_courier_assignments_courier ON public.courier_assignments(courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_courier ON public.orders(assigned_courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_token ON public.orders(delivery_token);

-- 5. Activer Row Level Security (RLS)
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_assignments ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour couriers
CREATE POLICY "Public Read couriers" ON public.couriers
    FOR SELECT USING (true);

CREATE POLICY "Admin All couriers" ON public.couriers
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Politiques RLS pour courier_assignments
CREATE POLICY "Public Read courier_assignments" ON public.courier_assignments
    FOR SELECT USING (true);

CREATE POLICY "Admin and Courier Write courier_assignments" ON public.courier_assignments
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Procédure RPC de vérification et validation sécurisée de l'OTP
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

    -- Notifier le client
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

    -- Notifier le vendeur
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

    -- Notifier l'administrateur
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

-- 7. Nettoyage des livreurs de test éventuels
DELETE FROM public.couriers 
WHERE id IN (
    '11111111-1111-1111-1111-111111111101', 
    '11111111-1111-1111-1111-111111111102', 
    '11111111-1111-1111-1111-111111111103'
) 
OR full_name LIKE '%(Express Moto)%' 
OR full_name LIKE '%(Coursier Kalagban)%' 
OR full_name LIKE '%(Livraison Abidjan)%';

-- 8. Forcer le rafraîchissement immédiat du cache de schéma Supabase (PostgREST)
NOTIFY pgrst, 'reload schema';
