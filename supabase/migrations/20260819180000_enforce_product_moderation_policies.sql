-- Migration: Expand products_status_check and enforce RLS policies for moderation

-- 1. Drop old restrictive constraint and allow expanded status enum
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_status_check CHECK (status IN ('draft', 'active', 'pending', 'rejected', 'archived'));

-- 2. Align statuses
UPDATE public.products
SET status = 'pending'
WHERE moderation_status = 'pending_review' OR moderation_status = 'pending';

UPDATE public.products
SET status = 'rejected'
WHERE moderation_status = 'rejected';

UPDATE public.products
SET status = 'active', moderation_status = 'approved'
WHERE moderation_status = 'approved' OR (moderation_status IS NULL AND status = 'active');

-- 3. RLS policy to ensure only approved products are publicly viewable by buyers
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products" ON public.products 
FOR SELECT USING (
    status = 'active' AND (moderation_status = 'approved' OR moderation_status IS NULL)
);

NOTIFY pgrst, 'reload schema';
