-- Migration pour l'ajout du statut de modération des boutiques et la sécurisation des accès
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended'));

-- Mise à jour des boutiques existantes sans statut défini
UPDATE public.shops SET status = 'active' WHERE status IS NULL;
