-- Migration: Attribution de Codes PIN Aléatoires Uniques pour chaque Point Relais
-- Date: 2026-08-19

-- 1. Ajout de la colonne pin_code si non existante
ALTER TABLE public.pickup_points ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10);

-- 2. Générer un Code PIN aléatoire à 6 chiffres unique pour chaque point relais existant
UPDATE public.pickup_points 
SET pin_code = floor(100000 + random() * 900000)::TEXT;

-- Synchroniser également avec le champ email pour compatibilité descendante
UPDATE public.pickup_points
SET email = 'pin:' || pin_code;

-- 3. Trigger pour générer automatiquement un code PIN aléatoire lors de l'insertion d'un nouveau point relais si non fourni
CREATE OR REPLACE FUNCTION public.generate_pickup_point_pin()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.pin_code IS NULL OR NEW.pin_code = '' OR NEW.pin_code = '123456' THEN
        NEW.pin_code := floor(100000 + random() * 900000)::TEXT;
    END IF;
    
    IF NEW.email IS NULL OR NEW.email = '' OR NEW.email LIKE 'pin:123456' THEN
        NEW.email := 'pin:' || NEW.pin_code;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_pickup_point_pin ON public.pickup_points;
CREATE TRIGGER trg_generate_pickup_point_pin
BEFORE INSERT OR UPDATE ON public.pickup_points
FOR EACH ROW
EXECUTE FUNCTION public.generate_pickup_point_pin();

NOTIFY pgrst, 'reload schema';
