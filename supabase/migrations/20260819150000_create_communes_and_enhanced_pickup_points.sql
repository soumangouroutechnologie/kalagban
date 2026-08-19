-- Migration: Table des Communes & Couleurs Visuelles + Gestion Avancée des Points Relais
-- Date: 2026-08-19

-- 1. Table des Communes avec codes couleurs distinctifs
CREATE TABLE IF NOT EXISTS public.communes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    color_hex VARCHAR(20) NOT NULL DEFAULT '#6366F1',
    badge_bg VARCHAR(50) DEFAULT 'rgba(99, 102, 241, 0.12)',
    badge_text VARCHAR(50) DEFAULT '#4338CA',
    city VARCHAR(100) DEFAULT 'Abidjan',
    zone VARCHAR(100) DEFAULT 'Abidjan Centre',
    latitude NUMERIC(10, 6) DEFAULT 5.3484,
    longitude NUMERIC(10, 6) DEFAULT -4.0197,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Communes
ALTER TABLE public.communes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read communes" ON public.communes FOR SELECT USING (true);
CREATE POLICY "Admin & Staff manage communes" ON public.communes FOR ALL USING (true);

-- 2. Insertion des 13 Communes officielles d'Abidjan avec leurs couleurs uniques
INSERT INTO public.communes (name, code, color_hex, badge_bg, badge_text, city, zone, latitude, longitude, display_order)
VALUES 
    ('Adjamé', 'ADJ', '#10B981', 'rgba(16, 185, 129, 0.12)', '#065F46', 'Abidjan', 'Abidjan Nord', 5.3567, -4.0245, 1),
    ('Cocody', 'COC', '#6366F1', 'rgba(99, 102, 241, 0.12)', '#3730A3', 'Abidjan', 'Abidjan Est', 5.3484, -3.9858, 2),
    ('Yopougon', 'YOP', '#F59E0B', 'rgba(245, 158, 11, 0.12)', '#92400E', 'Abidjan', 'Abidjan Ouest', 5.3438, -4.0725, 3),
    ('Marcory', 'MAR', '#8B5CF6', 'rgba(139, 92, 246, 0.12)', '#5B21B6', 'Abidjan', 'Abidjan Sud', 5.2974, -3.9870, 4),
    ('Plateau', 'PLA', '#06B6D4', 'rgba(6, 182, 212, 0.12)', '#155E75', 'Abidjan', 'Abidjan Centre', 5.3235, -4.0177, 5),
    ('Treichville', 'TRE', '#EC4899', 'rgba(236, 72, 153, 0.12)', '#9D174D', 'Abidjan', 'Abidjan Sud', 5.3032, -4.0094, 6),
    ('Koumassi', 'KOU', '#3B82F6', 'rgba(59, 130, 246, 0.12)', '#1E40AF', 'Abidjan', 'Abidjan Sud', 5.2905, -3.9482, 7),
    ('Port-Bouët', 'PB', '#EAB308', 'rgba(234, 179, 8, 0.12)', '#854D0E', 'Abidjan', 'Abidjan Littoral', 5.2575, -3.9298, 8),
    ('Abobo', 'ABO', '#EF4444', 'rgba(239, 68, 68, 0.12)', '#991B1B', 'Abidjan', 'Abidjan Nord', 5.4182, -4.0163, 9),
    ('Attécoubé', 'ATT', '#84CC16', 'rgba(132, 204, 22, 0.12)', '#3F6212', 'Abidjan', 'Abidjan Centre', 5.3377, -4.0416, 10),
    ('Bingerville', 'BIN', '#14B8A6', 'rgba(20, 184, 166, 0.12)', '#115E59', 'Abidjan', 'Grand Abidjan', 5.3556, -3.8950, 11),
    ('Songon', 'SON', '#64748B', 'rgba(100, 116, 139, 0.12)', '#334155', 'Abidjan', 'Grand Abidjan', 5.3167, -4.2667, 12),
    ('Anyama', 'ANY', '#A855F7', 'rgba(168, 85, 247, 0.12)', '#6B21A8', 'Abidjan', 'Grand Abidjan', 5.4944, -4.0519, 13)
ON CONFLICT (name) DO UPDATE 
SET color_hex = EXCLUDED.color_hex,
    badge_bg = EXCLUDED.badge_bg,
    badge_text = EXCLUDED.badge_text,
    zone = EXCLUDED.zone,
    display_order = EXCLUDED.display_order;

-- 3. Mise à jour de la table pickup_points avec commune_id et color_code
ALTER TABLE public.pickup_points ADD COLUMN IF NOT EXISTS commune_id UUID REFERENCES public.communes(id) ON DELETE SET NULL;
ALTER TABLE public.pickup_points ADD COLUMN IF NOT EXISTS color_code VARCHAR(20);
ALTER TABLE public.pickup_points ADD COLUMN IF NOT EXISTS zone_label VARCHAR(100);
ALTER TABLE public.pickup_points ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10);

-- Associer les pickup_points existants à leurs communes respectives et couleurs
UPDATE public.pickup_points p
SET commune_id = c.id,
    color_code = c.color_hex,
    zone_label = c.zone
FROM public.communes c
WHERE LOWER(TRIM(p.commune)) = LOWER(TRIM(c.name));

-- 4. Initialisation des Points Relais de référence avec codes PIN aléatoires uniques
INSERT INTO public.pickup_points (name, code, manager_name, phone, address, city, commune, commune_id, color_code, zone_label, max_capacity, commission_per_package, status, pin_code, email)
SELECT 
    'Hassan 220 logements',
    'RELAY-ADJ-941',
    'Monsieur Hassan',
    '+2250102030405',
    'Rond point de la liberté, Adjamé 220 logements',
    'Abidjan',
    'Adjamé',
    c.id,
    c.color_hex,
    c.zone,
    100,
    300,
    'active',
    floor(100000 + random() * 900000)::TEXT,
    'pin:' || floor(100000 + random() * 900000)::TEXT
FROM public.communes c
WHERE c.name = 'Adjamé'
ON CONFLICT (code) DO UPDATE 
SET commune_id = EXCLUDED.commune_id,
    color_code = EXCLUDED.color_code,
    zone_label = EXCLUDED.zone_label,
    address = EXCLUDED.address;

INSERT INTO public.pickup_points (name, code, manager_name, phone, address, city, commune, commune_id, color_code, zone_label, max_capacity, commission_per_package, status, pin_code, email)
SELECT 
    'Chez Samer Palmeraie',
    'RELAY-COC-260',
    'Mon Habib',
    '+2250101010101',
    'Non loin de la station Total Energie, Palmeraie, Cocody',
    'Abidjan',
    'Cocody',
    c.id,
    c.color_hex,
    c.zone,
    100,
    300,
    'active',
    floor(100000 + random() * 900000)::TEXT,
    'pin:' || floor(100000 + random() * 900000)::TEXT
FROM public.communes c
WHERE c.name = 'Cocody'
ON CONFLICT (code) DO UPDATE 
SET commune_id = EXCLUDED.commune_id,
    color_code = EXCLUDED.color_code,
    zone_label = EXCLUDED.zone_label,
    address = EXCLUDED.address;

INSERT INTO public.pickup_points (name, code, manager_name, phone, address, city, commune, commune_id, color_code, zone_label, max_capacity, commission_per_package, status, pin_code, email)
SELECT 
    'Relais Express Yopougon Bel Air',
    'RELAY-YOP-410',
    'Mme Kouamé Ahou',
    '+2250708091011',
    'Carrefour Bel Air, près de la pharmacie principale, Yopougon',
    'Abidjan',
    'Yopougon',
    c.id,
    c.color_hex,
    c.zone,
    100,
    300,
    'active',
    floor(100000 + random() * 900000)::TEXT,
    'pin:' || floor(100000 + random() * 900000)::TEXT
FROM public.communes c
WHERE c.name = 'Yopougon'
ON CONFLICT (code) DO UPDATE 
SET commune_id = EXCLUDED.commune_id,
    color_code = EXCLUDED.color_code,
    zone_label = EXCLUDED.zone_label,
    address = EXCLUDED.address;

INSERT INTO public.pickup_points (name, code, manager_name, phone, address, city, commune, commune_id, color_code, zone_label, max_capacity, commission_per_package, status, pin_code, email)
SELECT 
    'Relais Marcory Zone 4 Biétry',
    'RELAY-MAR-530',
    'M. Ibrahim Cissé',
    '+2250506070809',
    'Boulevard de Marseille, en face du supermarché Prima, Marcory',
    'Abidjan',
    'Marcory',
    c.id,
    c.color_hex,
    c.zone,
    80,
    300,
    'active',
    floor(100000 + random() * 900000)::TEXT,
    'pin:' || floor(100000 + random() * 900000)::TEXT
FROM public.communes c
WHERE c.name = 'Marcory'
ON CONFLICT (code) DO UPDATE 
SET commune_id = EXCLUDED.commune_id,
    color_code = EXCLUDED.color_code,
    zone_label = EXCLUDED.zone_label,
    address = EXCLUDED.address;

INSERT INTO public.pickup_points (name, code, manager_name, phone, address, city, commune, commune_id, color_code, zone_label, max_capacity, commission_per_package, status, pin_code, email)
SELECT 
    'Relais Plateau Cité Administrative',
    'RELAY-PLA-105',
    'Mme Diabaté Fatim',
    '+2250701020304',
    'Avenue Chardy, près de la Tour Postel 2001, Plateau',
    'Abidjan',
    'Plateau',
    c.id,
    c.color_hex,
    c.zone,
    80,
    300,
    'active',
    floor(100000 + random() * 900000)::TEXT,
    'pin:' || floor(100000 + random() * 900000)::TEXT
FROM public.communes c
WHERE c.name = 'Plateau'
ON CONFLICT (code) DO UPDATE 
SET commune_id = EXCLUDED.commune_id,
    color_code = EXCLUDED.color_code,
    zone_label = EXCLUDED.zone_label,
    address = EXCLUDED.address;

-- Assurer la publication Realtime pour les communes
DO $$ 
BEGIN 
    ALTER PUBLICATION supabase_realtime ADD TABLE public.communes; 
EXCEPTION WHEN OTHERS THEN NULL; 
END $$;

NOTIFY pgrst, 'reload schema';
