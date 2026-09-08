-- ==============================================================================
-- Migration: Secure RPC for Courier Public Delivery Information
-- Date: 2026-09-08
-- Description:
-- 1. Provides a robust SECURITY DEFINER function to retrieve courier route details.
-- 2. Strictly shields seller private phone and internal business data.
-- 3. Enables anonymous courier access via direct URL with zero 404/RLS blocking.
-- ==============================================================================

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
BEGIN
  IF p_order_id IS NULL OR trim(p_order_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Identifiant manquant.');
  END IF;

  v_clean_id := trim(p_order_id);

  -- 1. Recherche de la commande (exact UUID ou préfixe KB-XXXXX)
  IF v_clean_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT * INTO v_order FROM public.orders WHERE id = v_clean_id::uuid LIMIT 1;
  ELSE
    -- Retirer le préfixe KB- s'il existe
    v_clean_id := regexp_replace(v_clean_id, '^KB-', '', 'i');
    SELECT * INTO v_order FROM public.orders WHERE id::text ILIKE (v_clean_id || '%') LIMIT 1;
  END IF;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Commande introuvable.');
  END IF;

  -- 2. Récupération des articles de la commande (avec noms de produits)
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

  -- 3. Récupération de l'assignation coursier
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

  -- 4. Récupération des informations de la boutique (Nom + Adresse physique de retrait)
  DECLARE
    v_shop_name text := 'Boutique Partenaire KALAGBAN';
    v_shop_address text := 'Adresse de retrait boutique';
    v_shop_landmark text := '';
  BEGIN
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

    -- 5. Construction de la réponse sécurisée
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
          'address', COALESCE(v_shop_address, 'Adresse de retrait boutique'),
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
  END;

  RETURN v_result;
END;
$$;

-- Grant execution to public/anon for courier route access
GRANT EXECUTE ON FUNCTION public.get_public_delivery_info(text) TO anon, authenticated, service_role;
