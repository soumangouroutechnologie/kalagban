-- Migration: Ajout des colonnes reference_id et order_id à la table seller_notifications
ALTER TABLE public.seller_notifications 
ADD COLUMN IF NOT EXISTS reference_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- Index pour accélérer les recherches par référence de commande
CREATE INDEX IF NOT EXISTS idx_seller_notifications_reference_id ON public.seller_notifications(reference_id);
CREATE INDEX IF NOT EXISTS idx_seller_notifications_order_id ON public.seller_notifications(order_id);
