-- Migration: Allow universal read access to product_media and full access to admins

ALTER TABLE public.product_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view product media" ON public.product_media;
DROP POLICY IF EXISTS "Anyone can view product media" ON public.product_media;
DROP POLICY IF EXISTS "Admins can view and manage all product_media" ON public.product_media;
DROP POLICY IF EXISTS "Sellers manage own product media" ON public.product_media;

-- 1. Anyone (public, admin, seller) can SELECT product_media
CREATE POLICY "Anyone can view product media" ON public.product_media
FOR SELECT USING (true);

-- 2. Sellers and Admins can INSERT / UPDATE / DELETE product_media
CREATE POLICY "Sellers manage own product media" ON public.product_media
FOR ALL USING (
    auth.uid() = (SELECT shop_id FROM public.products WHERE id = product_id)
    OR public.is_admin()
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role IN ('admin', 'super_admin', 'moderator') OR profiles.admin_role IS NOT NULL)
    )
    OR auth.role() = 'service_role'
);

NOTIFY pgrst, 'reload schema';
