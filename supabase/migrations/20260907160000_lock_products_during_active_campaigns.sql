-- Migration: Verrouillage des produits sous promotion marketing active pour les vendeurs
-- Empêche les vendeurs de modifier le prix, le titre ou de supprimer des produits engagés dans une campagne active

CREATE OR REPLACE FUNCTION public.check_product_promo_lock()
RETURNS TRIGGER AS $$
DECLARE
    is_admin BOOLEAN := FALSE;
    campaign_name TEXT := NULL;
BEGIN
    -- 1. Vérifier si l'utilisateur est un administrateur ou le service_role
    BEGIN
        SELECT (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
        )) INTO is_admin;
    EXCEPTION WHEN OTHERS THEN
        is_admin := FALSE;
    END;

    -- Si c'est un admin ou un trigger système, autoriser l'opération
    IF is_admin THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- 2. Vérifier si le produit participe à une campagne marketing avec status = 'active'
    SELECT pc.title INTO campaign_name
    FROM public.campaign_products cp
    JOIN public.promotional_campaigns pc ON pc.id = cp.campaign_id
    WHERE cp.product_id = COALESCE(OLD.id, NEW.id)
      AND pc.status = 'active'
    LIMIT 1;

    -- 3. Si le produit est dans une campagne active, bloquer la modification ou suppression par le vendeur
    IF campaign_name IS NOT NULL THEN
        IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'Ce produit participe à la campagne active "%" et ne peut pas être supprimé.', campaign_name;
        ELSIF TG_OP = 'UPDATE' THEN
            -- Permettre uniquement la décrémentation de stock lors des ventes (via triggers internes)
            -- Bloquer les modifications de titre, description, prix, catégorie, shop_id
            IF (NEW.title IS DISTINCT FROM OLD.title OR 
                NEW.price IS DISTINCT FROM OLD.price OR 
                NEW.category IS DISTINCT FROM OLD.category OR
                NEW.description IS DISTINCT FROM OLD.description OR
                NEW.shop_id IS DISTINCT FROM OLD.shop_id) THEN
                RAISE EXCEPTION 'Ce produit participe à la campagne promotionnelle active "%". Les modifications sont verrouillées pour les vendeurs.', campaign_name;
            END IF;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trg_check_product_promo_lock ON public.products;

-- Créer le trigger avant UPDATE ou DELETE
CREATE TRIGGER trg_check_product_promo_lock
BEFORE UPDATE OR DELETE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.check_product_promo_lock();
