-- Migration: Création de la table system_logs pour le monitoring des erreurs et bugs système
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL CHECK (level IN ('error', 'critical', 'warning', 'info')),
    app TEXT NOT NULL CHECK (app IN ('mobile-buyer', 'mobile-seller', 'web-buyer', 'web-relay', 'web-admin', 'api', 'edge-function')),
    message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'ignored')),
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour des requêtes rapides sur les logs
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_app ON public.system_logs(app);
CREATE INDEX IF NOT EXISTS idx_system_logs_status ON public.system_logs(status);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);

-- Activer RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Politique d'insertion : autoriser l'insertion des logs pour tous (anon et authenticated)
CREATE POLICY "Allow log insertion from apps" 
ON public.system_logs 
FOR INSERT 
WITH CHECK (true);

-- Politique de lecture : autoriser la lecture pour les administrateurs et membres authentifiés
CREATE POLICY "Allow read system_logs for authenticated users" 
ON public.system_logs 
FOR SELECT 
TO authenticated 
USING (true);

-- Politique de mise à jour (statut résolu/en cours) pour les membres authentifiés
CREATE POLICY "Allow update system_logs for authenticated users" 
ON public.system_logs 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Activer la réplication Realtime sur system_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_logs;
