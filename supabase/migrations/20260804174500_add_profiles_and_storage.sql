-- Migration: Ajout des Profils Utilisateurs et du Stockage Média

-- 1. Table: profiles (Profil du vendeur)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sécurité RLS sur profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Configuration du Stockage (Storage)
-- Création du bucket 'kalagban_media' pour les photos de profil, logos et images de produits
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kalagban_media', 'kalagban_media', true)
ON CONFLICT (id) DO NOTHING;

-- Sécurité RLS sur le bucket de stockage
-- Tout le monde peut voir les médias
CREATE POLICY "Anyone can view kalagban_media" ON storage.objects FOR SELECT USING (bucket_id = 'kalagban_media');

-- Seuls les utilisateurs connectés (vendeurs) peuvent uploader dans le bucket
CREATE POLICY "Authenticated users can upload to kalagban_media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kalagban_media');

-- Seuls les propriétaires peuvent mettre à jour ou supprimer leurs images
CREATE POLICY "Users can update own media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'kalagban_media' AND auth.uid() = owner);
CREATE POLICY "Users can delete own media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'kalagban_media' AND auth.uid() = owner);
