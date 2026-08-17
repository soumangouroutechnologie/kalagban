-- Migration: Intégration et recalcul automatique des Frais d'Application Kalagban
-- Date: 2026-08-17

-- 1. Ajout des colonnes de décomposition financière sur la table orders
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'subtotal') THEN
        ALTER TABLE public.orders ADD COLUMN subtotal NUMERIC(12,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'application_fee') THEN
        ALTER TABLE public.orders ADD COLUMN application_fee NUMERIC(12,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'application_fee_rate') THEN
        ALTER TABLE public.orders ADD COLUMN application_fee_rate NUMERIC(6,4) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_fee') THEN
        ALTER TABLE public.orders ADD COLUMN shipping_fee NUMERIC(12,2) DEFAULT 0;
    END IF;
END $$;

-- 2. Fonction de calcul conforme au Barème Officiel Kalagban
CREATE OR REPLACE FUNCTION public.calculate_order_application_fee(p_subtotal NUMERIC)
RETURNS TABLE (
    rate NUMERIC(6,4),
    fee NUMERIC(12,2)
) AS $$
DECLARE
    v_rate NUMERIC(6,4);
    v_fee NUMERIC(12,2);
BEGIN
    IF p_subtotal IS NULL OR p_subtotal <= 0 THEN
        RETURN QUERY SELECT 0::NUMERIC(6,4), 0::NUMERIC(12,2);
        RETURN;
    END IF;

    IF p_subtotal <= 10000 THEN
        v_rate := 0.0475; -- 4.75%
    ELSIF p_subtotal <= 20000 THEN
        v_rate := 0.0300; -- 3.00%
    ELSIF p_subtotal <= 30000 THEN
        v_rate := 0.0200; -- 2.00%
    ELSIF p_subtotal <= 100000 THEN
        v_rate := 0.0150; -- 1.50%
    ELSE
        v_rate := 0.0099; -- 0.99%
    END IF;

    -- Arrondi financier FCFA
    v_fee := ROUND(p_subtotal * v_rate);

    RETURN QUERY SELECT v_rate, v_fee;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Trigger pour garantir que le serveur est la source de vérité absolue
CREATE OR REPLACE FUNCTION public.trg_process_order_fees()
RETURNS TRIGGER AS $$
DECLARE
    v_calc RECORD;
BEGIN
    -- Si le sous-total n'est pas précisé mais le total_amount existe (compatibilité legacy)
    IF NEW.subtotal IS NULL THEN
        NEW.subtotal := COALESCE(NEW.total_amount, 0);
    END IF;

    -- Frais de port sécurisés
    IF NEW.shipping_fee IS NULL THEN
        NEW.shipping_fee := 0;
    END IF;

    -- Recalcul strict selon le barème officiel
    SELECT rate, fee INTO v_calc FROM public.calculate_order_application_fee(NEW.subtotal);

    NEW.application_fee_rate := v_calc.rate;
    NEW.application_fee := v_calc.fee;
    NEW.total_amount := NEW.subtotal + NEW.application_fee + NEW.shipping_fee;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_calculate_fees ON public.orders;
CREATE TRIGGER trg_orders_calculate_fees
BEFORE INSERT OR UPDATE OF subtotal, shipping_fee ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trg_process_order_fees();

-- 4. Rétrocompatibilité : Mise à jour des commandes existantes
UPDATE public.orders
SET subtotal = total_amount
WHERE subtotal IS NULL;
