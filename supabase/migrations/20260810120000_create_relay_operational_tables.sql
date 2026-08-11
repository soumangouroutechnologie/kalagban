-- Migration: Tables Opérationnelles du Point Relais (Notifications & Logs Mouvements)
-- Date: 2026-08-10

-- 1. Table: relay_notifications (Notifications en temps réel pour les Points Relais)
CREATE TABLE IF NOT EXISTS public.relay_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pickup_point_id UUID REFERENCES public.pickup_points(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'deposit', 'pickup', 'payout', 'warning', 'lock')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.relay_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read relay_notifications" ON public.relay_notifications FOR SELECT USING (true);
CREATE POLICY "Public write relay_notifications" ON public.relay_notifications FOR ALL USING (true);

-- 2. Table: relay_logs (Historique des mouvements de colis en Point Relais)
CREATE TABLE IF NOT EXISTS public.relay_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pickup_point_id UUID REFERENCES public.pickup_points(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    order_code TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    action_type TEXT NOT NULL CHECK (action_type IN ('deposit', 'pickup', 'return')),
    otp_code VARCHAR(10),
    commission_earned NUMERIC(12, 2) DEFAULT 300,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.relay_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read relay_logs" ON public.relay_logs FOR SELECT USING (true);
CREATE POLICY "Public write relay_logs" ON public.relay_logs FOR ALL USING (true);

NOTIFY pgrst, 'reload schema';
