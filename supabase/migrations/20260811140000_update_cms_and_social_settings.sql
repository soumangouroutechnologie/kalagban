-- Migration pour la gestion complète du CMS, des réseaux sociaux et des accès médias
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_settings DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can manage site_settings" ON public.site_settings;
CREATE POLICY "Anyone can manage site_settings" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Insertion des valeurs par défaut si absentes
INSERT INTO public.site_settings (key, value)
VALUES 
  ('footer_contact', '{"address": "Abidjan, Côte d''Ivoire", "phone": "+225 07 00 00 00 00", "email": "contact@kalagban.ci"}'::jsonb),
  ('social_links', '{"whatsapp": "+2250700000000", "facebook": "https://facebook.com/kalagban", "instagram": "https://instagram.com/kalagban", "tiktok": "https://tiktok.com/@kalagban"}'::jsonb),
  ('flash_sale_timer', '{"enabled": true, "title": "VENTES FLASH DU MOMENT", "subtitle": "Offres exclusives limitées dans le temps !"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Verification du bucket cms-assets dans Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('cms-assets', 'cms-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Read cms-assets" ON storage.objects;
CREATE POLICY "Public Read cms-assets" ON storage.objects
FOR SELECT USING (bucket_id = 'cms-assets');

DROP POLICY IF EXISTS "Public Upload cms-assets" ON storage.objects;
CREATE POLICY "Public Upload cms-assets" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'cms-assets');

DROP POLICY IF EXISTS "Public Update cms-assets" ON storage.objects;
CREATE POLICY "Public Update cms-assets" ON storage.objects
FOR UPDATE USING (bucket_id = 'cms-assets');
