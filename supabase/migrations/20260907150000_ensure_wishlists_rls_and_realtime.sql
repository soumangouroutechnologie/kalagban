-- Ensure Wishlists table explicit RLS policies and Realtime publication
ALTER TABLE IF EXISTS public.wishlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own wishlist" ON public.wishlists;
DROP POLICY IF EXISTS "Users read own wishlist" ON public.wishlists;
DROP POLICY IF EXISTS "Users insert own wishlist" ON public.wishlists;
DROP POLICY IF EXISTS "Users update own wishlist" ON public.wishlists;
DROP POLICY IF EXISTS "Users delete own wishlist" ON public.wishlists;

CREATE POLICY "Users read own wishlist" ON public.wishlists
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own wishlist" ON public.wishlists
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own wishlist" ON public.wishlists
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own wishlist" ON public.wishlists
FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.wishlists;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
