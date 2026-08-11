-- Migration pour la gestion des Boutiques Vedettes et Données de Test Nettoyables

-- 1. Structuration de la table shops
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS featured_badge TEXT DEFAULT 'Vendeur Vérifié';

-- Désactivation temporaire des contraintes FK pour l'insertion de boutiques de test si auth.users n'a pas cet ID
ALTER TABLE public.shops DROP CONSTRAINT IF EXISTS shops_id_fkey;

-- 2. Insertion des Boutiques de Test
INSERT INTO public.shops (id, name, description, logo_url, is_featured, featured_badge)
VALUES 
  ('11111111-1111-4111-a111-111111111111', 'Pendycsa Mode & Tendance', 'Vêtements femme, homme et enfant certifiés à Abidjan', '/cousel1.jpg', true, 'Boutique Officielle'),
  ('22222222-2222-4222-a222-222222222222', 'TechIvoir Electronics', 'Smartphones, TV et accessoires high-tech sous garantie', '/carousel2.jpg', true, 'Top Vendeur Tech'),
  ('33333333-3333-4333-a333-333333333333', 'Maison & Déco Abidjan', 'Mobilier, électroménager et décoration tendance', '/carousel3.jpg', true, 'Partenaire Certifié')
ON CONFLICT (id) DO UPDATE 
SET 
  is_featured = EXCLUDED.is_featured,
  featured_badge = EXCLUDED.featured_badge;

-- 3. Insertion de la campagne Vente Flash Active de Test
INSERT INTO public.flash_sales (id, title, start_time, end_time, discount_percentage, status)
VALUES (
  'f1111111-1111-4111-a111-111111111111',
  'MEGA VENTES FLASH ABIDJAN',
  NOW(),
  NOW() + INTERVAL '3 days',
  35,
  'active'
) ON CONFLICT (id) DO NOTHING;

-- 4. Insertion de Produits de Test
INSERT INTO public.products (id, shop_id, title, description, category, price, old_price, stock_quantity, status)
VALUES 
  ('a1111111-1111-4111-a111-111111111111', '11111111-1111-4111-a111-111111111111', 'Ensemble Pagne & Robe Moderne', 'Tenue traditionnelle chic en tissu Wax de qualité supérieure.', 'Femme', 18500, 28000, 12, 'active'),
  ('a2222222-2222-4222-a222-222222222222', '22222222-2222-4222-a222-222222222222', 'Écouteurs Sans Fil Pro Bass', 'Casque audio Bluetooth réducteur de bruit avec micro HD intégré.', 'High-Tech', 12500, 22000, 4, 'active'),
  ('a3333333-3333-4333-a333-333333333333', '33333333-3333-4333-a333-333333333333', 'Lampe Design Déco Salon', 'Éclairage d''ambiance moderne LED basse consommation.', 'Déco & Maison', 15000, 25000, 8, 'active'),
  ('a4444444-4444-4444-a444-444444444444', '11111111-1111-4111-a111-111111111111', 'Chemise Homme Coton Premium', 'Chemise ajustée élégante idéale pour cérémonies et travail.', 'Homme', 14000, 20000, 15, 'active')
ON CONFLICT (id) DO UPDATE 
SET 
  price = EXCLUDED.price,
  old_price = EXCLUDED.old_price,
  status = EXCLUDED.status;

-- 5. Insertion des Médias Produits
INSERT INTO public.product_media (id, product_id, url, position)
VALUES 
  ('b1111111-1111-4111-a111-111111111111', 'a1111111-1111-4111-a111-111111111111', '/cousel1.jpg', 1),
  ('b2222222-2222-4222-a222-222222222222', 'a2222222-2222-4222-a222-222222222222', '/carousel2.jpg', 1),
  ('b3333333-3333-4333-a333-333333333333', 'a3333333-3333-4333-a333-333333333333', '/carousel3.jpg', 1),
  ('b4444444-4444-4444-a444-444444444444', 'a4444444-4444-4444-a444-444444444444', '/cousel1.jpg', 1)
ON CONFLICT (id) DO NOTHING;

-- 6. Association des Produits aux Ventes Flash
INSERT INTO public.flash_sale_products (flash_sale_id, product_id, special_price, stock_allocated)
VALUES 
  ('f1111111-1111-4111-a111-111111111111', 'a1111111-1111-4111-a111-111111111111', 18500, 10),
  ('f1111111-1111-4111-a111-111111111111', 'a2222222-2222-4222-a222-222222222222', 12500, 5)
ON CONFLICT (flash_sale_id, product_id) DO NOTHING;
