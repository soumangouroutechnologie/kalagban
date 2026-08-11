-- Migration: Full Database Tables & Seeds for Kalagban Marketplace Back-Office
-- Date: 2026-08-05

-- 1. Order Items table (Multi-vendor order items breakdown)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read order_items" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Admin write order_items" ON public.order_items FOR ALL USING (true);

-- 2. Payouts table (Vendor earnings payouts)
CREATE TABLE IF NOT EXISTS public.payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processed, failed
    payment_method VARCHAR(50) DEFAULT 'Wave', -- Wave, Orange Money, MTN MoMo, Moov, Bank
    reference_code VARCHAR(100),
    processed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read payouts" ON public.payouts FOR SELECT USING (true);
CREATE POLICY "Admin write payouts" ON public.payouts FOR ALL USING (true);

-- 3. Promotional Banners table
CREATE TABLE IF NOT EXISTS public.promotional_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    image_url TEXT NOT NULL,
    link_url TEXT,
    banner_type VARCHAR(50) DEFAULT 'homepage_hero',
    active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read promotional_banners" ON public.promotional_banners FOR SELECT USING (true);
CREATE POLICY "Admin write promotional_banners" ON public.promotional_banners FOR ALL USING (true);

-- 4. Audit Logs table (Security & action history)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    admin_name VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100),
    target_id VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read audit_logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "Admin write audit_logs" ON public.audit_logs FOR ALL USING (true);

NOTIFY pgrst, 'reload schema';
