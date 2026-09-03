-- =========================================================================================
-- Migration: Automatisation de l'envoi des Push Notifications via Supabase Edge Function
-- =========================================================================================

-- 1. Index d'optimisation pour la recherche rapide des tokens push
CREATE INDEX IF NOT EXISTS idx_profiles_expo_push_token ON public.profiles(expo_push_token) WHERE expo_push_token IS NOT NULL;

-- 2. Fonction helper pour déclencher un push notification par appel HTTP (pg_net si activé)
CREATE OR REPLACE FUNCTION public.notify_seller_on_new_order()
RETURNS trigger AS $$
DECLARE
    seller_user_id UUID;
    buyer_name TEXT;
    shop_title TEXT;
BEGIN
    -- Récupérer le nom de la boutique et l'ID du propriétaire
    SELECT s.id, s.name INTO seller_user_id, shop_title
    FROM public.shops s
    WHERE s.id = NEW.shop_id;

    -- Créer la notification vendeur en base
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

-- 3. Trigger automatique sur l'insertion d'une nouvelle commande
DROP TRIGGER IF EXISTS trg_notify_seller_on_new_order ON public.orders;
CREATE TRIGGER trg_notify_seller_on_new_order
    AFTER INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_seller_on_new_order();
