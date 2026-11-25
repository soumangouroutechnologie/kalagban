-- Migration : Verrouillage des politiques RLS sur public.shops et public.profiles
--
-- Problème corrigé :
--   Les migrations 20260812160000 et 20260812170000 ont créé
--     "Admin update shops"    ON shops    FOR ALL    USING (true)
--     "Admin update profiles" ON profiles FOR UPDATE USING (true)
--     "Admin insert profiles" ON profiles FOR INSERT WITH CHECK (true)
--   Ces politiques autorisaient N'IMPORTE QUI (même non connecté, avec la clé anon)
--   à créer / modifier / supprimer toutes les boutiques et à modifier tous les profils,
--   y compris s'attribuer le rôle 'admin' ou 'super_admin'.
--
-- Après cette migration :
--   - un utilisateur connecté ne peut créer / modifier QUE sa propre boutique et son propre profil ;
--   - seuls les administrateurs (public.is_admin()) peuvent gérer toutes les boutiques / profils ;
--   - les colonnes sensibles (rôle, rôle admin, statut, vérification) ne peuvent être changées
--     que par un administrateur, le service_role ou les fonctions internes (triggers SECURITY DEFINER).

-- ─────────────────────────────────────────────────────────────
-- 1. Suppression des politiques ouvertes à tous
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin update shops"    ON public.shops;
DROP POLICY IF EXISTS "Admin update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin insert profiles" ON public.profiles;

ALTER TABLE public.shops    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 2. Politiques propriétaire (recréées avec WITH CHECK explicite)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Sellers can insert own shop" ON public.shops;
DROP POLICY IF EXISTS "Sellers can update own shop" ON public.shops;
CREATE POLICY "Sellers can insert own shop" ON public.shops
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Sellers can update own shop" ON public.shops
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────
-- 3. Politiques administrateur (back-office web-admin)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins manage all shops" ON public.shops;
CREATE POLICY "Admins manage all shops" ON public.shops
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage all profiles" ON public.profiles;
CREATE POLICY "Admins manage all profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────
-- 4. Protection des colonnes sensibles
--    Les requêtes venant de l'API (rôles 'anon' / 'authenticated') sans droits admin
--    ne peuvent pas modifier ces colonnes. Les triggers internes (ex. handle_new_user,
--    SECURITY DEFINER) et le service_role ne sont pas concernés.
--    On passe par to_jsonb() pour ne pas échouer si une colonne n'existe pas.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_privileged_writer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_user NOT IN ('anon', 'authenticated')
      OR auth.role() = 'service_role'
      OR public.is_admin();
END;
$$ LANGUAGE plpgsql STABLE;

-- 4a. Profils : rôle, rôle admin, statut
CREATE OR REPLACE FUNCTION public.trg_protect_profile_sensitive_columns()
RETURNS TRIGGER AS $$
DECLARE
  v_new JSONB := to_jsonb(NEW);
  v_old JSONB;
BEGIN
  IF public.is_privileged_writer() THEN
    RETURN NEW;
  END IF;

  -- Un utilisateur ne peut se donner que le rôle acheteur ou vendeur
  IF v_new ? 'role' AND v_new->>'role' IS NOT NULL
     AND v_new->>'role' NOT IN ('buyer', 'seller') THEN
    RAISE EXCEPTION 'Sécurité : rôle "%" non autorisé.', v_new->>'role'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF v_new->>'admin_role' IS NOT NULL THEN
      RAISE EXCEPTION 'Sécurité : admin_role ne peut pas être défini par un utilisateur.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  v_old := to_jsonb(OLD);
  IF (v_new->'admin_role') IS DISTINCT FROM (v_old->'admin_role')
     OR (v_new->'status') IS DISTINCT FROM (v_old->'status') THEN
    RAISE EXCEPTION 'Sécurité : seul un administrateur peut modifier admin_role ou status.'
      USING ERRCODE = '42501';
  END IF;

  -- Un compte déjà administrateur ne peut pas être modifié en rôle par lui-même
  IF (v_old->>'role') NOT IN ('buyer', 'seller')
     AND (v_new->'role') IS DISTINCT FROM (v_old->'role') THEN
    RAISE EXCEPTION 'Sécurité : changement de rôle non autorisé.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_protect_sensitive ON public.profiles;
CREATE TRIGGER trg_profiles_protect_sensitive
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_protect_profile_sensitive_columns();

-- 4b. Boutiques : statut, vérification, mise en avant
CREATE OR REPLACE FUNCTION public.trg_protect_shop_sensitive_columns()
RETURNS TRIGGER AS $$
DECLARE
  v_new JSONB := to_jsonb(NEW);
  v_old JSONB;
BEGIN
  IF public.is_privileged_writer() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE((v_new->>'is_verified')::BOOLEAN, FALSE)
       OR COALESCE((v_new->>'is_featured')::BOOLEAN, FALSE)
       OR COALESCE(v_new->>'status', 'active') = 'suspended' THEN
      RAISE EXCEPTION 'Sécurité : champs de vérification réservés à l''administration.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  v_old := to_jsonb(OLD);
  IF (v_new->'status')       IS DISTINCT FROM (v_old->'status')
     OR (v_new->'is_verified')  IS DISTINCT FROM (v_old->'is_verified')
     OR (v_new->'is_featured')  IS DISTINCT FROM (v_old->'is_featured')
     OR (v_new->'kyc_deadline') IS DISTINCT FROM (v_old->'kyc_deadline') THEN
    RAISE EXCEPTION 'Sécurité : seul un administrateur peut modifier le statut ou la vérification de la boutique.'
      USING ERRCODE = '42501';
  END IF;

  -- Le vendeur peut seulement soumettre son dossier KYC (passage à 'pending')
  IF (v_new->'kyc_status') IS DISTINCT FROM (v_old->'kyc_status')
     AND v_new->>'kyc_status' IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Sécurité : statut KYC non modifiable par le vendeur.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shops_protect_sensitive ON public.shops;
CREATE TRIGGER trg_shops_protect_sensitive
  BEFORE INSERT OR UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.trg_protect_shop_sensitive_columns();

NOTIFY pgrst, 'reload schema';
