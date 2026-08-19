-- Migration: Strictly align product status with moderation workflow

-- 1. Pending review products must have status = 'pending'
UPDATE public.products
SET status = 'pending'
WHERE moderation_status = 'pending_review' OR moderation_status = 'pending';

-- 2. Rejected products must have status = 'rejected'
UPDATE public.products
SET status = 'rejected'
WHERE moderation_status = 'rejected';

-- 3. Approved products have status = 'active'
UPDATE public.products
SET status = 'active', moderation_status = 'approved'
WHERE moderation_status = 'approved';

NOTIFY pgrst, 'reload schema';
