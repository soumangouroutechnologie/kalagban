-- Migration pour s'assurer que les buckets 'kalagban_media' et 'cms_assets' existent et sont publics
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('kalagban_media', 'kalagban_media', true),
  ('cms_assets', 'cms_assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies pour la lecture publique
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select kalagban_media') THEN
    CREATE POLICY "Public select kalagban_media" ON storage.objects FOR SELECT USING (bucket_id = 'kalagban_media');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public select cms_assets') THEN
    CREATE POLICY "Public select cms_assets" ON storage.objects FOR SELECT USING (bucket_id = 'cms_assets');
  END IF;
END $$;
