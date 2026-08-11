-- Migration pour autoriser l'enregistrement des paramètres CMS site_settings, promotional_banners et category_bubbles
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.site_settings DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Anyone can manage site_settings" ON public.site_settings;

CREATE POLICY "Anyone can manage site_settings" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Table category_bubbles
CREATE TABLE IF NOT EXISTS public.category_bubbles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT,
  tag TEXT DEFAULT 'HOT',
  color TEXT DEFAULT 'from-purple-600 to-indigo-600',
  position INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.category_bubbles DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can manage category_bubbles" ON public.category_bubbles;
CREATE POLICY "Anyone can manage category_bubbles" ON public.category_bubbles FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.category_bubbles ENABLE ROW LEVEL SECURITY;

-- Table promotional_banners
CREATE TABLE IF NOT EXISTS public.promotional_banners (
  id BIGSERIAL PRIMARY KEY,
  title TEXT,
  subtitle TEXT,
  badge_text TEXT,
  image_url TEXT,
  target_url TEXT,
  ad_type TEXT DEFAULT 'standard',
  raw_html_code TEXT,
  is_active BOOLEAN DEFAULT true,
  position INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.promotional_banners DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can manage promotional_banners" ON public.promotional_banners;
CREATE POLICY "Anyone can manage promotional_banners" ON public.promotional_banners FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;
