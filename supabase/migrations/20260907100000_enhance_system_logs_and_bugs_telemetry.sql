-- Migration: Enrichissement de la table system_logs pour la télémétrie avancée et détection des bugs
ALTER TABLE IF EXISTS public.system_logs 
    ADD COLUMN IF NOT EXISTS fingerprint TEXT,
    ADD COLUMN IF NOT EXISTS device_id TEXT,
    ADD COLUMN IF NOT EXISTS device_os TEXT,
    ADD COLUMN IF NOT EXISTS device_model TEXT,
    ADD COLUMN IF NOT EXISTS route_or_screen TEXT,
    ADD COLUMN IF NOT EXISTS occurrences_count INTEGER DEFAULT 1;

-- Index pour recherche rapide et décompte des appareils
CREATE INDEX IF NOT EXISTS idx_system_logs_fingerprint ON public.system_logs(fingerprint);
CREATE INDEX IF NOT EXISTS idx_system_logs_device_id ON public.system_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_device_os ON public.system_logs(device_os);

-- Assouplissement / mise à jour de la contrainte CHECK sur app pour supporter web-seller
ALTER TABLE public.system_logs DROP CONSTRAINT IF EXISTS system_logs_app_check;
ALTER TABLE public.system_logs ADD CONSTRAINT system_logs_app_check 
    CHECK (app IN ('mobile-buyer', 'mobile-seller', 'web-buyer', 'web-seller', 'web-relay', 'web-admin', 'api', 'edge-function'));
