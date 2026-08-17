-- ==============================================================================
-- Migration: Extension Majeure RBAC, Logistique, Finance, Marketing & Support
-- Date: 2026-08-17
-- ==============================================================================

-- 1. EXTENSION DE LA TABLE admin_permissions AVEC PERMISSIONS GRANULAIRES
ALTER TABLE IF EXISTS public.admin_permissions
    ADD COLUMN IF NOT EXISTS custom_permissions JSONB DEFAULT '{}'::jsonb,
    -- Logistique
    ADD COLUMN IF NOT EXISTS can_manage_logistics BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_view_relays BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_manage_relays BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_view_couriers BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_manage_couriers BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_view_deliveries BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_manage_deliveries BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_assign_couriers BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_manage_routes BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_view_live_map BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_manage_relay_inventory BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_view_logistics_incidents BOOLEAN DEFAULT false,
    -- Commandes
    ADD COLUMN IF NOT EXISTS can_view_orders BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS can_manage_orders BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS can_update_order_status BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS can_cancel_orders BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_view_customer_order_data BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS can_view_order_financial_data BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_export_orders BOOLEAN DEFAULT false,
    -- Finances
    ADD COLUMN IF NOT EXISTS can_view_transactions BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_manage_transactions BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_manage_refunds BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_manage_payouts BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_manage_commissions BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_manage_application_fees BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_view_financial_reports BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_export_financial_reports BOOLEAN DEFAULT false,
    -- Marketing
    ADD COLUMN IF NOT EXISTS can_manage_marketing BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_manage_campaigns BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_manage_promotions BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_manage_coupons BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_send_marketing_notifications BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_view_marketing_analytics BOOLEAN DEFAULT false,
    -- Support
    ADD COLUMN IF NOT EXISTS can_view_support BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_manage_support_tickets BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_view_customer_profiles BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_contact_users BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_escalate_support BOOLEAN DEFAULT false,
    -- Risques
    ADD COLUMN IF NOT EXISTS can_view_risk BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_manage_risk_alerts BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_investigate_risk BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_suspend_accounts BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_view_security_events BOOLEAN DEFAULT false,
    -- Analytics & Notifications
    ADD COLUMN IF NOT EXISTS can_view_analytics BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS can_view_logistics_analytics BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_view_financial_analytics BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_view_seller_analytics BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_export_reports BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS can_send_notifications BOOLEAN DEFAULT false;

-- 2. TABLE: couriers (Livreurs partenaires & Flotte Kalagban)
CREATE TABLE IF NOT EXISTS public.couriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    photo_url TEXT,
    vehicle_type VARCHAR(50) DEFAULT 'moto' CHECK (vehicle_type IN ('moto', 'voiture', 'camionnette', 'velo', 'a_pied')),
    license_plate VARCHAR(50),
    preferred_zone VARCHAR(100) DEFAULT 'Abidjan',
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('offline', 'available', 'on_delivery', 'suspended', 'pending_verification')),
    total_deliveries INTEGER DEFAULT 0,
    rating NUMERIC(3,2) DEFAULT 5.00,
    acceptance_rate NUMERIC(5,2) DEFAULT 100.00,
    cancellation_rate NUMERIC(5,2) DEFAULT 0.00,
    id_card_url TEXT,
    driving_license_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read couriers" ON public.couriers FOR SELECT USING (true);
CREATE POLICY "Admin write couriers" ON public.couriers FOR ALL USING (true);

-- 3. TABLE: courier_assignments (Missions & Livraisons attribuées aux livreurs)
CREATE TABLE IF NOT EXISTS public.courier_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_id UUID NOT NULL REFERENCES public.couriers(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    pickup_point_id UUID REFERENCES public.pickup_points(id) ON DELETE SET NULL,
    origin_address TEXT,
    destination_address TEXT,
    status VARCHAR(50) DEFAULT 'assigned' CHECK (status IN ('assigned', 'picked_up', 'in_transit', 'arrived_at_relay', 'delivered', 'cancelled', 'failed')),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    picked_up_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.courier_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read courier_assignments" ON public.courier_assignments FOR SELECT USING (true);
CREATE POLICY "Admin write courier_assignments" ON public.courier_assignments FOR ALL USING (true);

-- 4. TABLE: relay_inventory (Casier Virtuel des Colis en Stock dans chaque Point Relais)
CREATE TABLE IF NOT EXISTS public.relay_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pickup_point_id UUID NOT NULL REFERENCES public.pickup_points(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    order_code VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    seller_name VARCHAR(255),
    seller_phone VARCHAR(50),
    deposited_by_name VARCHAR(255),
    deposited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    retrieved_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'retrieved', 'overdue', 'returned_to_sender', 'disputed')),
    max_retention_days INTEGER DEFAULT 5,
    is_overdue BOOLEAN DEFAULT false,
    otp_code VARCHAR(10),
    otp_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.relay_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read relay_inventory" ON public.relay_inventory FOR SELECT USING (true);
CREATE POLICY "Admin write relay_inventory" ON public.relay_inventory FOR ALL USING (true);

-- 5. TABLE: logistics_incidents (Gestion des Incidents Logistiques)
CREATE TABLE IF NOT EXISTS public.logistics_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_type VARCHAR(100) NOT NULL CHECK (incident_type IN ('retard', 'colis_introuvable', 'relais_sature', 'livreur_indisponible', 'panne_vehicule', 'erreur_adresse', 'client_injoignable', 'refus_colis', 'probleme_technique', 'autre')),
    severity VARCHAR(50) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'cancelled')),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    order_code VARCHAR(100),
    pickup_point_id UUID REFERENCES public.pickup_points(id) ON DELETE SET NULL,
    courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    resolution_notes TEXT,
    reported_by VARCHAR(255),
    assigned_to VARCHAR(255),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.logistics_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read logistics_incidents" ON public.logistics_incidents FOR SELECT USING (true);
CREATE POLICY "Admin write logistics_incidents" ON public.logistics_incidents FOR ALL USING (true);

-- 6. TABLE: platform_pricing_rules (Tarification & Règles de Commissions Dynamiques)
CREATE TABLE IF NOT EXISTS public.platform_pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('application_fee', 'commission', 'shipping', 'payment_gateway', 'relay_commission')),
    value_type VARCHAR(50) DEFAULT 'percentage' CHECK (value_type IN ('percentage', 'fixed_amount', 'tiered')),
    current_value NUMERIC(12,4) NOT NULL,
    config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    updated_by VARCHAR(255),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.platform_pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read platform_pricing_rules" ON public.platform_pricing_rules FOR SELECT USING (true);
CREATE POLICY "Admin write platform_pricing_rules" ON public.platform_pricing_rules FOR ALL USING (true);

-- Insertion des règles tarifaires par défaut
INSERT INTO public.platform_pricing_rules (rule_key, name, description, category, value_type, current_value, config)
VALUES 
    ('app_fee_tier_1', 'Frais d''application (Tranche Standard < 20 000 FCFA)', 'Frais d''application appliqué aux commandes jusqu''à 20 000 FCFA', 'application_fee', 'percentage', 4.75, '{"min_subtotal": 0, "max_subtotal": 20000}'::jsonb),
    ('app_fee_tier_2', 'Frais d''application (Tranche Moyenne 20 000 - 50 000 FCFA)', 'Frais d''application appliqué aux commandes moyennes', 'application_fee', 'percentage', 4.00, '{"min_subtotal": 20000, "max_subtotal": 50000}'::jsonb),
    ('app_fee_tier_3', 'Frais d''application (Tranche Supérieure > 50 000 FCFA)', 'Frais d''application appliqué aux commandes premium', 'application_fee', 'percentage', 3.25, '{"min_subtotal": 50000, "max_subtotal": 9999999}'::jsonb),
    ('vendor_commission_standard', 'Commission Vendeur Standard', 'Pourcentage prélevé sur les ventes des boutiques partenaires', 'commission', 'percentage', 5.00, '{}'::jsonb),
    ('relay_commission_standard', 'Commission Point Relais par Colis', 'Montant fixe reversé au gérant du point relais pour chaque colis retiré avec succès', 'relay_commission', 'fixed_amount', 300.00, '{}'::jsonb),
    ('shipping_relay_fee', 'Frais de Livraison en Point Relais', 'Tarif forfaitaire facturé au client pour le retrait en Point Relais', 'shipping', 'fixed_amount', 1000.00, '{}'::jsonb),
    ('shipping_home_fee', 'Frais de Livraison à Domicile', 'Tarif forfaitaire facturé au client pour la livraison express à domicile', 'shipping', 'fixed_amount', 1500.00, '{}'::jsonb)
ON CONFLICT (rule_key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    current_value = EXCLUDED.current_value;

-- 7. TABLE: pricing_audit_logs (Journal d'Audit des Changements Tarifaires)
CREATE TABLE IF NOT EXISTS public.pricing_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_key VARCHAR(100) NOT NULL,
    old_value NUMERIC(12,4),
    new_value NUMERIC(12,4),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_name VARCHAR(255),
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pricing_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read pricing_audit_logs" ON public.pricing_audit_logs FOR SELECT USING (true);
CREATE POLICY "Admin write pricing_audit_logs" ON public.pricing_audit_logs FOR INSERT WITH CHECK (true);

-- 8. TABLE: support_tickets & support_messages (Espace Support & Réclamations)
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_code VARCHAR(50) UNIQUE NOT NULL,
    subject VARCHAR(255) NOT NULL,
    user_type VARCHAR(50) DEFAULT 'buyer' CHECK (user_type IN ('buyer', 'seller', 'courier', 'relay_manager', 'visitor')),
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255),
    user_phone VARCHAR(50),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    order_code VARCHAR(100),
    category VARCHAR(50) DEFAULT 'order' CHECK (category IN ('order', 'delivery', 'payment', 'refund', 'counterfeit_report', 'technical', 'account', 'other')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
    assigned_admin VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL CHECK (sender_type IN ('admin', 'user')),
    sender_name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read support_tickets" ON public.support_tickets FOR SELECT USING (true);
CREATE POLICY "Admin write support_tickets" ON public.support_tickets FOR ALL USING (true);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read support_messages" ON public.support_messages FOR SELECT USING (true);
CREATE POLICY "Admin write support_messages" ON public.support_messages FOR ALL USING (true);

-- 9. TABLE: marketing_coupons & marketing_campaigns (Espace Marketing)
CREATE TABLE IF NOT EXISTS public.marketing_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_type VARCHAR(50) DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value NUMERIC(12,2) NOT NULL,
    min_order_amount NUMERIC(12,2) DEFAULT 0,
    max_discount_amount NUMERIC(12,2),
    usage_limit INTEGER DEFAULT 100,
    used_count INTEGER DEFAULT 0,
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_audience VARCHAR(50) DEFAULT 'all' CHECK (target_audience IN ('all', 'buyers', 'sellers', 'inactive_buyers', 'vip_buyers')),
    channel VARCHAR(50) DEFAULT 'push_and_banner' CHECK (channel IN ('banner', 'push_notification', 'email', 'sms', 'push_and_banner')),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'paused')),
    banner_url TEXT,
    cta_text VARCHAR(100),
    cta_url TEXT,
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ends_at TIMESTAMP WITH TIME ZONE,
    impressions_count INTEGER DEFAULT 0,
    clicks_count INTEGER DEFAULT 0,
    conversions_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.marketing_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read marketing_coupons" ON public.marketing_coupons FOR SELECT USING (true);
CREATE POLICY "Admin write marketing_coupons" ON public.marketing_coupons FOR ALL USING (true);

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read marketing_campaigns" ON public.marketing_campaigns FOR SELECT USING (true);
CREATE POLICY "Admin write marketing_campaigns" ON public.marketing_campaigns FOR ALL USING (true);

-- 10. TABLE: risk_alerts (Espace Risques & Sécurité)
CREATE TABLE IF NOT EXISTS public.risk_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(100) NOT NULL CHECK (alert_type IN ('suspicious_order', 'velocity_abuse', 'failed_otp_bruteforce', 'high_refund_rate', 'counterfeit_flag', 'fake_shop', 'ip_mismatch', 'chargeback_risk')),
    severity VARCHAR(50) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    target_entity_type VARCHAR(50) NOT NULL CHECK (target_entity_type IN ('order', 'user', 'shop', 'courier', 'relay_point')),
    target_entity_id VARCHAR(255) NOT NULL,
    target_entity_label VARCHAR(255),
    description TEXT NOT NULL,
    risk_score INTEGER DEFAULT 50 CHECK (risk_score BETWEEN 0 AND 100),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed', 'account_frozen')),
    investigated_by VARCHAR(255),
    action_taken TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.risk_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read risk_alerts" ON public.risk_alerts FOR SELECT USING (true);
CREATE POLICY "Admin write risk_alerts" ON public.risk_alerts FOR ALL USING (true);

-- 11. TABLE: admin_notifications (Centre de Notifications Générales)
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target_group VARCHAR(50) DEFAULT 'all' CHECK (target_group IN ('all', 'buyers', 'sellers', 'couriers', 'admins')),
    notification_type VARCHAR(50) DEFAULT 'info' CHECK (notification_type IN ('info', 'promo', 'maintenance', 'warning', 'security')),
    sent_by VARCHAR(255),
    delivered_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read admin_notifications" ON public.admin_notifications FOR SELECT USING (true);
CREATE POLICY "Admin write admin_notifications" ON public.admin_notifications FOR ALL USING (true);

-- 12. ACTIVATION SUPABASE REALTIME POUR TOUTES LES NOUVELLES TABLES
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.couriers; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.courier_assignments; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.relay_inventory; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.logistics_incidents; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_pricing_rules; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_coupons; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.marketing_campaigns; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.risk_alerts; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_permissions; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 13. Rechargement du cache schéma
NOTIFY pgrst, 'reload schema';
