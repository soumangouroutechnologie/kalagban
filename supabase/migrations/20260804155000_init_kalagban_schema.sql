-- Migration: Initialisation du Schéma Kalagban (Boutiques, Produits, Commandes)

-- 1. Table: shops (Boutiques des vendeurs)
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Activation de la sécurité RLS sur shops
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers can view own shop" ON public.shops FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Sellers can update own shop" ON public.shops FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Sellers can insert own shop" ON public.shops FOR INSERT WITH CHECK (auth.uid() = id);
-- Les clients doivent pouvoir voir la boutique du vendeur
CREATE POLICY "Anyone can view shops" ON public.shops FOR SELECT USING (true);


-- 2. Table: products (Catalogue des produits)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price NUMERIC NOT NULL,
    old_price NUMERIC,
    stock_quantity INTEGER DEFAULT 0 NOT NULL,
    sku TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Activation de la sécurité RLS sur products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers manage own products" ON public.products FOR ALL USING (auth.uid() = shop_id);
-- Les clients ne peuvent voir que les produits "actifs" (publiés)
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (status = 'active');


-- 3. Table: product_media (Images associées aux produits)
CREATE TABLE IF NOT EXISTS public.product_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers manage own product media" ON public.product_media FOR ALL USING (
  auth.uid() = (SELECT shop_id FROM public.products WHERE id = product_id)
);
CREATE POLICY "Anyone can view product media" ON public.product_media FOR SELECT USING (true);


-- 4. Table: product_options (Ex: Tailles, Couleurs)
CREATE TABLE IF NOT EXISTS public.product_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- Ex: 'Taille'
    values JSONB NOT NULL DEFAULT '[]'::jsonb, -- Ex: '["S", "M", "L"]'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers manage own product options" ON public.product_options FOR ALL USING (
  auth.uid() = (SELECT shop_id FROM public.products WHERE id = product_id)
);
CREATE POLICY "Anyone can view product options" ON public.product_options FOR SELECT USING (true);


-- 5. Table: orders (Commandes reçues par la boutique)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    total_amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
-- Seul le vendeur propriétaire de la boutique a le droit de voir et gérer ses commandes
CREATE POLICY "Sellers manage own orders" ON public.orders FOR ALL USING (auth.uid() = shop_id);
-- (Ici, nous pourrions ajouter une politique pour que le client voie sa commande, basé sur un cookie ou un token)


-- 6. Table: order_items (Contenu exact d'une commande)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC NOT NULL,
    variant_details JSONB, -- Stocke le choix du client (Ex: {"Taille": "M", "Couleur": "Rouge"})
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers manage own order items" ON public.order_items FOR ALL USING (
  auth.uid() = (SELECT shop_id FROM public.orders WHERE id = order_id)
);
