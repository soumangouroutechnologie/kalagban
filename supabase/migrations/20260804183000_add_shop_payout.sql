-- Migration: Add payout methods to shops

ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS payout_provider TEXT CHECK (payout_provider IN ('Wave', 'Orange Money', 'MTN Mobile Money', 'Moov Money')),
ADD COLUMN IF NOT EXISTS payout_phone TEXT;
