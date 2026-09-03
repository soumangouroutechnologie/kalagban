-- =========================================================================================
-- Migration: Automatisation de l'envoi des Push Notifications via Supabase Edge Function
-- =========================================================================================

-- 1. Ajout de la colonne expo_push_token dans profiles (au cas où elle n'existe pas encore)
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS expo_push_token VARCHAR(255);

-- 2. Index d'optimisation pour la recherche rapide des tokens push
CREATE INDEX IF NOT EXISTS idx_profiles_expo_push_token ON public.profiles(expo_push_token) WHERE expo_push_token IS NOT NULL;

-- 3. Fonction automatique pour créer la notification vendeur lors d'une nouvelle commande
CREATE OR REPLACE FUNCTION public.notify_seller_on_new_order()
RETURNS trigger AS $$
DECLARE
    seller_user_id UUID;
    shop_title TEXT;
BEGIN
    SELECT s.id, s.name INTO seller_user_id, shop_title
    FROM public.shops s
    WHERE s.id = NEW.shop_id;

    IF seller_user_id IS NOT NULL THEN
        INSERT INTO public.seller_notifications (
            shop_id,
            title,
            message,
            type,
            reference_id
        ) VALUES (
            NEW.shop_id,
            'Nouvelle Commande Reçue 🛍️',
            'Commande #' || UPPER(SUBSTRING(NEW.id::text, 1, 8)) || ' de ' || COALESCE(NEW.customer_name, 'un client') || ' (' || NEW.total_amount || ' FCFA).',
            'order',
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Déclencheur (Trigger) sur la table des commandes
DROP TRIGGER IF EXISTS trg_notify_seller_on_new_order ON public.orders;
CREATE TRIGGER trg_notify_seller_on_new_order
    AFTER INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_seller_on_new_order();
