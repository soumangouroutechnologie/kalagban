-- Migration: Création de la table de Certification Vendeur (KYC) et colonnes associées
-- Date: 17 Août 2026

-- 1. Ajout des colonnes de certification dans la table shops
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS kyc_deadline TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '5 days'),
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'unsubmitted';

-- 2. Création de la table seller_certifications
CREATE TABLE IF NOT EXISTS public.seller_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    seller_name TEXT NOT NULL,
    id_type TEXT NOT NULL DEFAULT 'cni', -- 'cni', 'passport', 'attestation', 'permis'
    id_number TEXT NOT NULL,
    id_card_front_url TEXT NOT NULL,
    id_card_back_url TEXT,
    seller_photo_url TEXT NOT NULL,
    primary_phone TEXT NOT NULL,
    secondary_phone TEXT,
    store_address TEXT NOT NULL,
    store_photos JSONB DEFAULT '[]'::jsonb,
    location_description TEXT,
    signature_url TEXT NOT NULL,
    terms_accepted BOOLEAN DEFAULT true NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected'
    admin_notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index pour accélérer les recherches de l'administration
CREATE INDEX IF NOT EXISTS idx_seller_certifications_shop_id ON public.seller_certifications(shop_id);
CREATE INDEX IF NOT EXISTS idx_seller_certifications_status ON public.seller_certifications(status);

-- 3. Sécurité RLS sur seller_certifications
ALTER TABLE public.seller_certifications ENABLE ROW LEVEL SECURITY;

-- Le vendeur peut voir son propre dossier
CREATE POLICY "Sellers can view own certification" 
ON public.seller_certifications 
FOR SELECT 
USING (auth.uid() = shop_id);

-- Le vendeur peut créer ou mettre à jour son dossier
CREATE POLICY "Sellers can insert own certification" 
ON public.seller_certifications 
FOR INSERT 
WITH CHECK (auth.uid() = shop_id);

CREATE POLICY "Sellers can update own certification" 
ON public.seller_certifications 
FOR UPDATE 
USING (auth.uid() = shop_id);

-- L'administrateur / Service conformité peut tout lire et mettre à jour
CREATE POLICY "Admins can view all certifications" 
ON public.seller_certifications 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can update all certifications" 
ON public.seller_certifications 
FOR UPDATE 
USING (true);
