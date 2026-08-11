-- Migration: Création du module Points Relais (Table pickup_points, Suivi Colis, OTP & Payouts)
-- Date: 2026-08-10

-- 1. Table: pickup_points (Partenaires Points Relais Kalagban)
CREATE TABLE IF NOT EXISTS public.pickup_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    manager_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Abidjan',
    commune TEXT NOT NULL,
    latitude NUMERIC(10, 6) DEFAULT 5.3484,
    longitude NUMERIC(10, 6) DEFAULT -4.0197,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'full', 'closed')),
    max_capacity INTEGER DEFAULT 100,
    current_packages_count INTEGER DEFAULT 0,
    commission_per_package NUMERIC(12, 2) DEFAULT 300,
    total_commissions_earned NUMERIC(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pickup_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read pickup_points" ON public.pickup_points FOR SELECT USING (true);
CREATE POLICY "Admin write pickup_points" ON public.pickup_points FOR ALL USING (true);

-- 2. Mise à jour de la table orders pour la livraison en Point Relais & Code OTP
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_type') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_type TEXT DEFAULT 'home_delivery';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'pickup_point_id') THEN
        ALTER TABLE public.orders ADD COLUMN pickup_point_id UUID REFERENCES public.pickup_points(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'pickup_code') THEN
        ALTER TABLE public.orders ADD COLUMN pickup_code VARCHAR(10);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'relay_status') THEN
        ALTER TABLE public.orders ADD COLUMN relay_status TEXT DEFAULT 'pending_deposit';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'deposited_at') THEN
        ALTER TABLE public.orders ADD COLUMN deposited_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'picked_up_at') THEN
        ALTER TABLE public.orders ADD COLUMN picked_up_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 3. Table: relay_payouts (Versements de commissions aux Points Relais)
CREATE TABLE IF NOT EXISTS public.relay_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pickup_point_id UUID NOT NULL REFERENCES public.pickup_points(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
    payment_method TEXT DEFAULT 'Wave',
    reference_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.relay_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read relay_payouts" ON public.relay_payouts FOR SELECT USING (true);
CREATE POLICY "Admin write relay_payouts" ON public.relay_payouts FOR ALL USING (true);

NOTIFY pgrst, 'reload schema';
