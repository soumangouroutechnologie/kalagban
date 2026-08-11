-- 1. Ajouter full_name et role à public.profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'buyer';

UPDATE public.profiles 
SET role = 'seller' 
WHERE id IN (SELECT id FROM public.shops);

-- 2. Ajouter customer_id et shipping_address à public.orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS shipping_address TEXT;

-- 2. Politique RLS pour que les clients voient et créent leurs propres commandes
CREATE POLICY "Buyers can view own orders" ON public.orders 
FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Buyers can create own orders" ON public.orders 
FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- 3. Politiques RLS pour order_items
CREATE POLICY "Buyers can insert order items" ON public.order_items 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = order_id AND customer_id = auth.uid()
  )
);

CREATE POLICY "Buyers can view own order items" ON public.order_items 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = order_id AND customer_id = auth.uid()
  )
);

-- 4. Table: customer_addresses (Carnet d'adresses client)
CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Abidjan',
    district TEXT NOT NULL, -- Ex: 'Cocody', 'Yopougon'
    landmark TEXT, -- Ex: 'En face de la pharmacie'
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own addresses" ON public.customer_addresses 
FOR ALL USING (auth.uid() = user_id);

-- 5. Table: wishlists (Produits favoris de l'acheteur)
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, product_id)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own wishlist" ON public.wishlists 
FOR ALL USING (auth.uid() = user_id);
