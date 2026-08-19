-- Migration: Allow administrators and moderators to view and update all products regardless of status
-- Fixes RLS blocking admins from seeing products in 'pending_review' or 'rejected' states

-- 1. Ensure is_admin helper covers all admin variations
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND (role IN ('admin', 'super_admin', 'moderator') OR admin_role IS NOT NULL)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Allow Admins full access to all products for moderation
DROP POLICY IF EXISTS "Admins can view and manage all products" ON public.products;
CREATE POLICY "Admins can view and manage all products" ON public.products
FOR ALL
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role IN ('admin', 'super_admin', 'moderator') OR profiles.admin_role IS NOT NULL)
    )
    OR auth.role() = 'service_role'
);

-- 3. Allow Admins full access to all product media
DROP POLICY IF EXISTS "Admins can view and manage all product_media" ON public.product_media;
CREATE POLICY "Admins can view and manage all product_media" ON public.product_media
FOR ALL
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role IN ('admin', 'super_admin', 'moderator') OR profiles.admin_role IS NOT NULL)
    )
    OR auth.role() = 'service_role'
);

NOTIFY pgrst, 'reload schema';
