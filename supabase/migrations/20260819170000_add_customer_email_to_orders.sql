-- Migration: Add customer_email to orders table if not present, and populate from auth.users

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Populate existing orders from auth.users table
UPDATE public.orders o
SET customer_email = u.email
FROM auth.users u
WHERE o.customer_id = u.id AND (o.customer_email IS NULL OR o.customer_email = '');

NOTIFY pgrst, 'reload schema';
