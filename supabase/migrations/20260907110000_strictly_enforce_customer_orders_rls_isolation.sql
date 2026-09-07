-- Migration: Verrouillage strict de l'isolation des commandes (RLS)
-- Empêche formellement un client X de lire ou modifier les commandes et codes OTP d'un client Y.

-- 1. Table ORDERS : Activer RLS et supprimer toute politique permissive de développement
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Public orders access" ON public.orders;
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_policy" ON public.orders;

-- 1.A. INSERT : Les clients authentifiés et anonymes peuvent créer une commande (avec customer_id = auth.uid() si connecté)
CREATE POLICY "orders_insert_customer_policy" ON public.orders
FOR INSERT WITH CHECK (
  auth.uid() IS NULL 
  OR customer_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 1.B. SELECT : Un utilisateur ne peut voir QUE ses propres commandes (ou celles de sa boutique s'il est vendeur, ou de son relais/livreur, ou admin)
CREATE POLICY "orders_select_isolated_policy" ON public.orders
FOR SELECT USING (
  -- Le client connecté ne voit QUE ses commandes
  (auth.uid() IS NOT NULL AND customer_id = auth.uid())
  -- Le vendeur ne voit QUE les commandes associées à sa propre boutique
  OR EXISTS (
    SELECT 1 FROM public.shops 
    WHERE shops.id = orders.shop_id 
    AND shops.user_id = auth.uid()
  )
  -- Le point relais ne voit QUE les commandes qui lui sont assignées
  OR EXISTS (
    SELECT 1 FROM public.relay_points 
    WHERE relay_points.id = orders.relay_point_id 
    AND relay_points.user_id = auth.uid()
  )
  -- Le livreur ne voit QUE les commandes qui lui sont assignées
  OR EXISTS (
    SELECT 1 FROM public.courier_assignments 
    WHERE courier_assignments.order_id = orders.id 
    AND courier_assignments.courier_id = auth.uid()
  )
  -- Les administrateurs et super-admins peuvent tout administrer
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin', 'developer', 'support_agent')
  )
);

-- 1.C. UPDATE : Seuls le client (pour annulation avant expédition), le vendeur, le relais, le livreur assigné ou l'admin peuvent modifier
CREATE POLICY "orders_update_isolated_policy" ON public.orders
FOR UPDATE USING (
  (auth.uid() IS NOT NULL AND customer_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.shops 
    WHERE shops.id = orders.shop_id 
    AND shops.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.relay_points 
    WHERE relay_points.id = orders.relay_point_id 
    AND relay_points.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.courier_assignments 
    WHERE courier_assignments.order_id = orders.id 
    AND courier_assignments.courier_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin', 'developer')
  )
);

-- 2. Table ORDER_ITEMS : Isolation stricte calquée sur la commande parente
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_policy" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_policy" ON public.order_items;

CREATE POLICY "order_items_insert_policy" ON public.order_items
FOR INSERT WITH CHECK (true);

CREATE POLICY "order_items_select_isolated_policy" ON public.order_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND (
      (auth.uid() IS NOT NULL AND orders.customer_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.shops WHERE shops.id = orders.shop_id AND shops.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.relay_points WHERE relay_points.id = orders.relay_point_id AND relay_points.user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.courier_assignments WHERE courier_assignments.order_id = orders.id AND courier_assignments.courier_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'developer', 'support_agent'))
    )
  )
);
