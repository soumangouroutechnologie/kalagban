-- Migration: Extension de la table couriers pour le KYC, les engins et les sociétés partenaires
-- Date: 17 Août 2026

-- 1. Modification des colonnes de la table couriers
ALTER TABLE public.couriers 
ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS id_card_type VARCHAR(50) DEFAULT 'cni',
ADD COLUMN IF NOT EXISTS id_card_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS id_card_front_url TEXT,
ADD COLUMN IF NOT EXISTS id_card_back_url TEXT,
ADD COLUMN IF NOT EXISTS coverage_type VARCHAR(50) DEFAULT 'all_abidjan',
ADD COLUMN IF NOT EXISTS preferred_communes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_partner_company BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_manager VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS registered_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Mise à jour de la contrainte CHECK sur vehicle_type si nécessaire
ALTER TABLE public.couriers DROP CONSTRAINT IF EXISTS couriers_vehicle_type_check;
ALTER TABLE public.couriers ADD CONSTRAINT couriers_vehicle_type_check 
CHECK (vehicle_type IN ('moto', 'voiture', 'camion', 'camionnette', 'tricycle_triporteur', 'velo', 'a_pied', 'autre'));

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_couriers_phone ON public.couriers(phone);
CREATE INDEX IF NOT EXISTS idx_couriers_vehicle_type ON public.couriers(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_couriers_status ON public.couriers(status);
