-- ==============================================================================
-- Migration : Verrouillage strict de l'isolation des commandes (Row Level Security)
-- Empêche formellement un client X de lire ou modifier les commandes et codes OTP d'un client Y.
-- ==============================================================================

-- 1. Table ORDERS : Activer RLS et supprimer les anciennes politiques
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Public orders access" ON public.orders;
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_update_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_delete_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_customer_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_select_isolated_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_update_isolated_policy" ON public.orders;

-- 1.A. INSERT : Création de commandes par le client (avec customer_id = auth.uid() si connecté)
CREATE POLICY "orders_insert_customer_policy" ON public.orders
FOR INSERT WITH CHECK (
  auth.uid() IS NULL 
  OR customer_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 1.B. SELECT : Isolation stricte multi-tenant
CREATE POLICY "orders_select_isolated_policy" ON public.orders
FOR SELECT USING (
  -- Le client connecté ne voit QUE ses propres commandes
  (auth.uid() IS NOT NULL AND customer_id = auth.uid())
  -- Le vendeur connecté ne voit QUE les commandes de sa propre boutique
  OR (auth.uid() IS NOT NULL AND shop_id = auth.uid())
  -- Les administrateurs et super-admins peuvent tout administrer
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin', 'developer', 'support_agent')
  )
);

-- 1.C. UPDATE : Modification strictement réservée au propriétaire ou au vendeur de la commande
CREATE POLICY "orders_update_isolated_policy" ON public.orders
FOR UPDATE USING (
  (auth.uid() IS NOT NULL AND customer_id = auth.uid())
  OR (auth.uid() IS NOT NULL AND shop_id = auth.uid())
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
DROP POLICY IF EXISTS "order_items_select_isolated_policy" ON public.order_items;

CREATE POLICY "order_items_insert_policy" ON public.order_items
FOR INSERT WITH CHECK (true);

CREATE POLICY "order_items_select_isolated_policy" ON public.order_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND (
      (auth.uid() IS NOT NULL AND orders.customer_id = auth.uid())
      OR (auth.uid() IS NOT NULL AND orders.shop_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'super_admin', 'developer', 'support_agent'))
    )
  )
);

NOTIFY pgrst, 'reload schema';
