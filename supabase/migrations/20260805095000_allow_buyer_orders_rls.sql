-- Migration: Autoriser les acheteurs (anonymes et authentifiés) à passer des commandes

-- 1. Autoriser la création et la lecture des commandes par tout le monde
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read orders" ON public.orders;
CREATE POLICY "Anyone can read orders" ON public.orders FOR SELECT USING (true);

-- 2. Autoriser la création et la lecture des articles de commande
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read order items" ON public.order_items;
CREATE POLICY "Anyone can read order items" ON public.order_items FOR SELECT USING (true);
