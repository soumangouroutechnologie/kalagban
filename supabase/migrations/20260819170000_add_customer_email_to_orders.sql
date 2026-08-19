-- Migration: Add customer_email to orders table if not present, and populate from profiles

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Populate existing orders from profiles table
UPDATE public.orders o
SET customer_email = p.email
FROM public.profiles p
WHERE o.customer_id = p.id AND o.customer_email IS NULL;

NOTIFY pgrst, 'reload schema';
