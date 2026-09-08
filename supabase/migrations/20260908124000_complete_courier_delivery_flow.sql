-- ==============================================================================
-- Migration: Complete Courier Delivery Flow (Info, Pickup, OTP Verification)
-- Date: 2026-09-08
-- Description:
-- 1. get_public_delivery_info: Returns complete route details (Point A shop pickup + Point B client delivery)
-- 2. confirm_courier_pickup: Lets courier confirm physical package pickup without RLS blocks
-- 3. verify_courier_delivery_otp: Validates customer secret OTP and finalizes delivery
-- ==============================================================================

-- 1. RPC: Obtenir les détails de la course de livraison
CREATE OR REPLACE FUNCTION public.get_public_delivery_info(p_order_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_items jsonb := '[]'::jsonb;
  v_courier jsonb := null;
  v_assignment record;
  v_clean_id text;
  v_result jsonb;
  v_shop_name text := 'Boutique Partenaire KALAGBAN';
  v_shop_address text := 'Centre d''Expédition / Adresse commerçant';
  v_shop_landmark text := '';
BEGIN
  IF p_order_id IS NULL OR trim(p_order_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Identifiant manquant.');
  END IF;

  v_clean_id := trim(p_order_id);

  -- Recherche de la commande (exact UUID ou préfixe KB-XXXXX)
  IF v_clean_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT * INTO v_order FROM public.orders WHERE id = v_clean_id::uuid LIMIT 1;
  ELSE
    v_clean_id := regexp_replace(v_clean_id, '^KB-', '', 'i');
    SELECT * INTO v_order FROM public.orders WHERE id::text ILIKE (v_clean_id || '%') LIMIT 1;
  END IF;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande introuvable.');
  END IF;

  -- Récupération des articles de la commande
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', oi.id,
      'quantity', oi.quantity,
      'unit_price', oi.unit_price,
      'products', jsonb_build_object('title', COALESCE(p.title, 'Article'))
    )
  )
  INTO v_items
  FROM public.order_items oi
  LEFT JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = v_order.id;

  IF v_items IS NULL THEN
    v_items := '[]'::jsonb;
  END IF;

  -- Récupération de l'assignation coursier
  SELECT ca.id, ca.status, ca.assigned_at, ca.delivered_at, ca.notes, ca.courier_id
  INTO v_assignment
  FROM public.courier_assignments ca
  WHERE ca.order_id = v_order.id
  ORDER BY ca.created_at DESC
  LIMIT 1;

  IF v_assignment.courier_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'id', c.id,
      'full_name', c.full_name,
      'phone', c.phone,
      'vehicle_type', c.vehicle_type,
      'license_plate', c.license_plate,
      'preferred_zone', c.preferred_zone
    )
    INTO v_courier
    FROM public.couriers c
    WHERE c.id = v_assignment.courier_id;
  END IF;

  -- Récupération des informations de la boutique (Nom + Adresse physique de retrait)
  IF v_order.shop_id IS NOT NULL THEN
    SELECT 
      COALESCE(s.name, 'Boutique Partenaire KALAGBAN'),
      COALESCE(sc.store_address, 'Centre d''Expédition Vendeur'),
      COALESCE(sc.location_description, '')
    INTO v_shop_name, v_shop_address, v_shop_landmark
    FROM public.shops s
    LEFT JOIN public.seller_certifications sc ON sc.shop_id = s.id
    WHERE s.id = v_order.shop_id;
  END IF;

  -- Construction de la réponse sécurisée
  v_result := jsonb_build_object(
    'success', true,
    'order', jsonb_build_object(
      'id', v_order.id,
      'orderCode', 'KB-' || UPPER(SUBSTRING(v_order.id::text, 1, 8)),
      'customerName', COALESCE(v_order.customer_name, 'Client'),
      'customerPhone', COALESCE(v_order.customer_phone, ''),
      'customerEmail', COALESCE(v_order.customer_email, ''),
      'shippingAddress', COALESCE(v_order.shipping_address, 'Abidjan'),
      'totalAmount', COALESCE(v_order.total_amount, 0),
      'status', v_order.status,
      'deliveryType', COALESCE(v_order.delivery_type, 'home_delivery'),
      'createdAt', v_order.created_at,
      'shop', jsonb_build_object(
        'name', COALESCE(v_shop_name, 'Boutique Partenaire KALAGBAN'),
        'address', COALESCE(v_shop_address, 'Centre d''Expédition / Adresse commerçant'),
        'landmark', COALESCE(v_shop_landmark, ''),
        'payout_phone', ''
      ),
      'items', v_items,
      'assignment', CASE 
        WHEN v_assignment.id IS NOT NULL THEN
          jsonb_build_object(
            'id', v_assignment.id,
            'status', v_assignment.status,
            'assigned_at', v_assignment.assigned_at,
            'delivered_at', v_assignment.delivered_at,
            'notes', v_assignment.notes,
            'couriers', v_courier
          )
        ELSE NULL
      END
    )
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_delivery_info(text) TO anon, authenticated, service_role;


-- 2. RPC: Prise en charge du colis par le coursier (Point A ➔ Point B)
CREATE OR REPLACE FUNCTION public.confirm_courier_pickup(
  p_order_id text,
  p_courier_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_clean_id text;
  v_now timestamptz := now();
  v_courier_name text := 'votre livreur dédié';
  v_order_code text;
BEGIN
  IF p_order_id IS NULL OR trim(p_order_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Identifiant de commande manquant.');
  END IF;

  v_clean_id := trim(p_order_id);

  IF v_clean_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT * INTO v_order FROM public.orders WHERE id = v_clean_id::uuid LIMIT 1;
  ELSE
    v_clean_id := regexp_replace(v_clean_id, '^KB-', '', 'i');
    SELECT * INTO v_order FROM public.orders WHERE id::text ILIKE (v_clean_id || '%') LIMIT 1;
  END IF;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande introuvable.');
  END IF;

  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cette commande a été annulée.');
  END IF;

  IF v_order.status = 'delivered' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cette commande a déjà été livrée.');
  END IF;

  v_order_code := 'KB-' || UPPER(SUBSTRING(v_order.id::text, 1, 8));

  -- Mettre à jour le statut de la commande à 'in_transit'
  UPDATE public.orders
  SET status = 'in_transit', relay_status = 'in_transit', updated_at = v_now
  WHERE id = v_order.id;

  -- Mettre à jour l'assignation du coursier
  UPDATE public.courier_assignments
  SET status = 'in_transit', picked_up_at = v_now
  WHERE order_id = v_order.id;

  -- Nom du coursier si fourni
  IF p_courier_id IS NOT NULL THEN
    SELECT full_name INTO v_courier_name FROM public.couriers WHERE id = p_courier_id;
    IF v_courier_name IS NULL OR v_courier_name = '' THEN
      v_courier_name := 'votre livreur dédié';
    END IF;
  END IF;

  -- Notifier le client
  IF v_order.customer_id IS NOT NULL THEN
    INSERT INTO public.customer_notifications (
      customer_id, order_id, title, message, type
    ) VALUES (
      v_order.customer_id,
      v_order.id,
      'Colis en Route vers votre Domicile 🛵',
      'Votre colis a été pris en charge par ' || v_courier_name || '. Il fait actuellement route vers votre adresse de livraison !',
      'order'
    );
  END IF;

  -- Notifier le vendeur
  IF v_order.shop_id IS NOT NULL THEN
    INSERT INTO public.seller_notifications (
      shop_id, title, message, type, reference_id
    ) VALUES (
      v_order.shop_id,
      'Colis Remis au Livreur 📦',
      'Le coursier ' || v_courier_name || ' a pris en charge le colis de la commande #' || v_order_code || '.',
      'order',
      v_order.id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Prise en charge validée. Vous pouvez maintenant faire route vers le client !'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_courier_pickup(text, uuid) TO anon, authenticated, service_role;


-- 3. RPC: Validation finale par Code Secret OTP
CREATE OR REPLACE FUNCTION public.verify_courier_delivery_otp(
  p_order_id text,
  p_otp text,
  p_courier_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_clean_id text;
  v_clean_otp text;
  v_now timestamptz := now();
  v_order_code text;
  v_is_match boolean := false;
BEGIN
  IF p_order_id IS NULL OR trim(p_order_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Identifiant de commande manquant.');
  END IF;

  IF p_otp IS NULL OR trim(p_otp) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Veuillez saisir le code OTP donné par le client.');
  END IF;

  v_clean_id := trim(p_order_id);
  v_clean_otp := trim(p_otp);

  IF v_clean_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT * INTO v_order FROM public.orders WHERE id = v_clean_id::uuid LIMIT 1;
  ELSE
    v_clean_id := regexp_replace(v_clean_id, '^KB-', '', 'i');
    SELECT * INTO v_order FROM public.orders WHERE id::text ILIKE (v_clean_id || '%') LIMIT 1;
  END IF;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande introuvable.');
  END IF;

  IF v_order.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cette commande a été annulée.');
  END IF;

  IF v_order.status = 'delivered' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Cette commande a déjà été validée.');
  END IF;

  -- Vérification du code OTP
  IF (v_order.pickup_code IS NOT NULL AND lower(trim(v_order.pickup_code)) = lower(v_clean_otp))
     OR (v_order.delivery_otp IS NOT NULL AND lower(trim(v_order.delivery_otp)) = lower(v_clean_otp)) THEN
    v_is_match := true;
  END IF;

  IF NOT v_is_match THEN
    RETURN jsonb_build_object('success', false, 'error', 'Code secret OTP incorrect. Veuillez demander au client de vérifier son écran de commande.');
  END IF;

  v_order_code := 'KB-' || UPPER(SUBSTRING(v_order.id::text, 1, 8));

  -- Valider la livraison
  UPDATE public.orders
  SET status = 'delivered', relay_status = 'picked_up', delivered_at = v_now, updated_at = v_now
  WHERE id = v_order.id;

  -- Mettre à jour l'assignation
  UPDATE public.courier_assignments
  SET status = 'delivered', delivered_at = v_now
  WHERE order_id = v_order.id;

  -- Mettre à jour le statut du coursier
  IF p_courier_id IS NOT NULL THEN
    UPDATE public.couriers
    SET total_deliveries = COALESCE(total_deliveries, 0) + 1, status = 'available'
    WHERE id = p_courier_id;
  END IF;

  -- Notifier le client
  IF v_order.customer_id IS NOT NULL THEN
    INSERT INTO public.customer_notifications (
      customer_id, order_id, title, message, type
    ) VALUES (
      v_order.customer_id,
      v_order.id,
      'Colis Livré avec Succès ! 🎉',
      'Votre commande #' || v_order_code || ' a été remise en main propre. Merci d''avoir choisi Kalagban !',
      'order'
    );
  END IF;

  -- Notifier le vendeur
  IF v_order.shop_id IS NOT NULL THEN
    INSERT INTO public.seller_notifications (
      shop_id, title, message, type, reference_id
    ) VALUES (
      v_order.shop_id,
      'Commande Livrée & Gains Confirmés 🎉',
      'La commande #' || v_order_code || ' a été remise au client avec validation du code OTP.',
      'order',
      v_order.id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Livraison validée avec succès !'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_courier_delivery_otp(text, text, uuid) TO anon, authenticated, service_role;
