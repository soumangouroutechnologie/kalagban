-- ==============================================================================
-- Migration: Secure RPCs for Courier Pickup Confirmation & OTP Delivery Verification
-- Date: 2026-09-08
-- Description:
-- 1. confirm_courier_pickup: Validates courier taking over parcel without RLS blockage.
-- 2. verify_courier_delivery_otp: Validates client secret OTP and completes delivery.
-- ==============================================================================

-- 1. RPC: Prise en charge du colis par le coursier
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


-- 2. RPC: Validation finale par Code Secret OTP
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
