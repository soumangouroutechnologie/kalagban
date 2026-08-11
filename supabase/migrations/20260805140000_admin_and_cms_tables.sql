-- Migration: Admin Back-Office RBAC & Live Visual CMS Settings Table
-- Date: 2026-08-05

-- 1. Add admin_role column to public.profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS admin_role VARCHAR(50) DEFAULT 'moderator';

-- 2. Create public.admin_permissions table
CREATE TABLE IF NOT EXISTS public.admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    can_manage_team BOOLEAN DEFAULT false,
    can_edit_cms BOOLEAN DEFAULT false,
    can_view_finance BOOLEAN DEFAULT false,
    can_moderate_shops BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_permission UNIQUE(user_id)
);

-- Enable RLS on admin_permissions
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin permissions"
    ON public.admin_permissions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Super Admins can manage admin permissions"
    ON public.admin_permissions FOR ALL
    TO authenticated
    USING (true);

-- 3. Create public.site_settings table for Visual CMS
CREATE TABLE IF NOT EXISTS public.site_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read site_settings"
    ON public.site_settings FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Admins manage site_settings"
    ON public.site_settings FOR ALL
    TO authenticated
    USING (true);

-- 4. Seed initial default site_settings
INSERT INTO public.site_settings (key, value) VALUES
(
    'top_banner',
    '{
        "enabled": true,
        "text": "Bienvenue sur Kalagban — La Marketplace n°1 des vendeurs vérifiés en Côte d''Ivoire !",
        "bg_color": "#6d28d9",
        "text_color": "#ffffff"
    }'::jsonb
),
(
    'hero_section',
    '{
        "badge_text": "OFFRES EXCLUSIVES & LIVRAISON RAPIDE",
        "title_start": "Achetez directement chez les",
        "title_highlight": "meilleurs commerçants",
        "title_end": ".",
        "description": "Découvrez des milliers de produits authentiques au meilleur prix : mode, électronique, beauté et plus encore.",
        "button_text": "Explorer le catalogue",
        "carousel_images": [
            "/hero_3d_shopping_bag.png",
            "/cousel1.jpg",
            "/carousel2.jpg",
            "/carousel3.jpg"
        ]
    }'::jsonb
),
(
    'promo_banner',
    '{
        "enabled": true,
        "phone_number": "25 20 00 61 61",
        "callout_label": "Commandez au",
        "title": "CATÉGORIE DU JOUR",
        "subtitle": "Télévisions & Tech",
        "price_tag": "DÈS 45 000 FCFA",
        "image_url": "/promo_banner_tech.png"
    }'::jsonb
),
(
    'footer_contact',
    '{
        "address": "Abidjan, Côte d''Ivoire",
        "phone": "+225 07 00 00 00 00",
        "email": "contact@kalagban.ci",
        "about_text": "La plateforme e-commerce n°1 connectant les acheteurs aux meilleurs commerçants et vendeurs certifiés en Côte d''Ivoire."
    }'::jsonb
)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, updated_at = NOW();

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
