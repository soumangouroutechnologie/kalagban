-- Migration : Module Marketing Avancé, Programme de Fidélité et Système de Parrainage
-- Date : 2026-09-01
-- Auteur : SOUMANGOUROU TECHNOLOGIE

-- 1. Table des paramètres globaux de fidélité (Paramétrable en dynamique par l'admin)
CREATE TABLE IF NOT EXISTS public.loyalty_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    points_per_1000_cfa INTEGER DEFAULT 10,
    point_value_cfa NUMERIC(10,2) DEFAULT 5.00,
    min_points_to_redeem INTEGER DEFAULT 100,
    max_discount_pct INTEGER DEFAULT 30,
    referral_reward_referrer INTEGER DEFAULT 500,
    referral_reward_referred INTEGER DEFAULT 250,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertion de la configuration initiale si non existante
INSERT INTO public.loyalty_settings (id, points_per_1000_cfa, point_value_cfa, min_points_to_redeem, max_discount_pct, referral_reward_referrer, referral_reward_referred)
VALUES (1, 10, 5.00, 100, 30, 500, 250)
ON CONFLICT (id) DO NOTHING;

-- 2. Table des comptes de fidélité acheteurs
CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
    lifetime_points INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
    tier VARCHAR(50) NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    referral_code VARCHAR(30) UNIQUE NOT NULL,
    referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_referral_code ON public.loyalty_accounts(referral_code);

-- 3. Table des transactions de points de fidélité (Grand livre auditable)
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    points INTEGER NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('purchase_earn', 'checkout_redeem', 'referral_bonus', 'welcome_gift', 'admin_adjustment', 'refund_compensation')),
    description TEXT NOT NULL,
    balance_after INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_id ON public.loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_order_id ON public.loyalty_transactions(order_id);

-- 4. Table de suivi des parrainages
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    referral_code VARCHAR(30) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
    qualifying_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    reward_points_referrer INTEGER DEFAULT 0,
    reward_points_referred INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    rewarded_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);

-- 5. Table d'historique des utilisations de codes promos (Anti-abus)
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id UUID NOT NULL REFERENCES public.marketing_coupons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    discount_applied NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_user ON public.coupon_redemptions(coupon_id, user_id);

-- 6. Extension de la table orders pour traçabilité comptable exacte
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.marketing_coupons(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS loyalty_points_used INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS loyalty_discount_amount NUMERIC(12,2) DEFAULT 0;

-- 7. Politiques de Sécurité Row Level Security (RLS)
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read loyalty_settings" ON public.loyalty_settings FOR SELECT USING (true);
CREATE POLICY "Admin write loyalty_settings" ON public.loyalty_settings FOR ALL USING (true);

ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own loyalty account" ON public.loyalty_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin manage loyalty accounts" ON public.loyalty_accounts FOR ALL USING (true);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own transactions" ON public.loyalty_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin manage loyalty transactions" ON public.loyalty_transactions FOR ALL USING (true);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Admin manage referrals" ON public.referrals FOR ALL USING (true);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own coupon redemptions" ON public.coupon_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin manage coupon redemptions" ON public.coupon_redemptions FOR ALL USING (true);

-- 8. Fonctions Stockées Sécurisées (PostgreSQL RPC)

-- A. Fonction pour obtenir ou créer le compte fidélité d'un utilisateur avec code parrainage unique
CREATE OR REPLACE FUNCTION public.fn_get_or_create_loyalty_account(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_account RECORD;
    v_new_code TEXT;
    v_tier VARCHAR(50);
BEGIN
    SELECT * INTO v_account FROM public.loyalty_accounts WHERE user_id = p_user_id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'user_id', v_account.user_id,
            'points_balance', v_account.points_balance,
            'lifetime_points', v_account.lifetime_points,
            'tier', v_account.tier,
            'referral_code', v_account.referral_code
        );
    END IF;

    -- Génération d'un code de parrainage unique (Ex: KLG-A7E9B)
    LOOP
        v_new_code := 'KLG-' || UPPER(SUBSTRING(MD5(p_user_id::TEXT || NOW()::TEXT || RANDOM()::TEXT) FROM 1 FOR 6));
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.loyalty_accounts WHERE referral_code = v_new_code);
    END LOOP;

    INSERT INTO public.loyalty_accounts (user_id, points_balance, lifetime_points, tier, referral_code)
    VALUES (p_user_id, 0, 0, 'bronze', v_new_code)
    RETURNING * INTO v_account;

    RETURN jsonb_build_object(
        'user_id', v_account.user_id,
        'points_balance', v_account.points_balance,
        'lifetime_points', v_account.lifetime_points,
        'tier', v_account.tier,
        'referral_code', v_account.referral_code
    );
END;
$$;

-- B. Fonction sécurisée de déduction des points au checkout
CREATE OR REPLACE FUNCTION public.fn_redeem_loyalty_points(
    p_user_id UUID,
    p_points INTEGER,
    p_order_id UUID,
    p_discount_cfa NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    IF p_points <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Le montant de points doit être supérieur à 0');
    END IF;

    SELECT points_balance INTO v_current_balance
    FROM public.loyalty_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Compte fidélité inexistant');
    END IF;

    IF v_current_balance < p_points THEN
        RETURN jsonb_build_object('success', false, 'error', 'Solde de points insuffisant');
    END IF;

    v_new_balance := v_current_balance - p_points;

    UPDATE public.loyalty_accounts
    SET points_balance = v_new_balance, updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO public.loyalty_transactions (
        user_id,
        order_id,
        points,
        transaction_type,
        description,
        balance_after
    ) VALUES (
        p_user_id,
        p_order_id,
        -p_points,
        'checkout_redeem',
        'Utilisation de ' || p_points || ' points pour réduction de ' || p_discount_cfa || ' FCFA',
        v_new_balance
    );

    RETURN jsonb_build_object(
        'success', true,
        'points_redeemed', p_points,
        'new_balance', v_new_balance
    );
END;
$$;

-- C. Fonction sécurisée de crédit de points (Achat validé ou geste commercial admin)
CREATE OR REPLACE FUNCTION public.fn_credit_loyalty_points(
    p_user_id UUID,
    p_points INTEGER,
    p_order_id UUID,
    p_type VARCHAR(50),
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance INTEGER;
    v_lifetime INTEGER;
    v_new_balance INTEGER;
    v_new_lifetime INTEGER;
    v_tier VARCHAR(50);
BEGIN
    IF p_points <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Points invalides');
    END IF;

    -- Créer ou récupérer le compte
    PERFORM public.fn_get_or_create_loyalty_account(p_user_id);

    SELECT points_balance, lifetime_points INTO v_current_balance, v_lifetime
    FROM public.loyalty_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;

    v_new_balance := v_current_balance + p_points;
    v_new_lifetime := v_lifetime + p_points;

    -- Calcul dynamique du palier
    IF v_new_lifetime >= 10000 THEN
        v_tier := 'platinum';
    ELSIF v_new_lifetime >= 5000 THEN
        v_tier := 'gold';
    ELSIF v_new_lifetime >= 2000 THEN
        v_tier := 'silver';
    ELSE
        v_tier := 'bronze';
    END IF;

    UPDATE public.loyalty_accounts
    SET points_balance = v_new_balance,
        lifetime_points = v_new_lifetime,
        tier = v_tier,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO public.loyalty_transactions (
        user_id,
        order_id,
        points,
        transaction_type,
        description,
        balance_after
    ) VALUES (
        p_user_id,
        p_order_id,
        p_points,
        p_type,
        p_reason,
        v_new_balance
    );

    RETURN jsonb_build_object(
        'success', true,
        'points_credited', p_points,
        'new_balance', v_new_balance,
        'tier', v_tier
    );
END;
$$;

-- 9. Enable Realtime Publications
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_accounts; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_transactions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.referrals; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.coupon_redemptions; EXCEPTION WHEN OTHERS THEN NULL; END $$;
