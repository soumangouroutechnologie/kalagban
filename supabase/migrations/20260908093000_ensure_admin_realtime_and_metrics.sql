-- ==============================================================================
-- Migration: Ensure Admin Realtime Subscriptions & Aggregated Metrics Function
-- Date: 2026-09-08
-- Description:
-- 1. Adds all admin dashboard monitoring tables to the Supabase Realtime publication.
-- 2. Sets REPLICA IDENTITY FULL for instant change payloads.
-- 3. Adds an optional RPC function get_admin_dashboard_metrics() for high-speed aggregated refresh.
-- ==============================================================================

-- 1. Enable Realtime on core operational tables if not already present
DO $$
BEGIN
  -- orders
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;

  -- shops
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'shops'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE shops;
  END IF;

  -- profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;

  -- payouts
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'payouts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payouts;
  END IF;

  -- products
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'products'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
  END IF;

  -- support_tickets
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_tickets') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'support_tickets'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
    END IF;
  END IF;

  -- logistics_incidents
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'logistics_incidents') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'logistics_incidents'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE logistics_incidents;
    END IF;
  END IF;

  -- admin_notifications
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_notifications') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'admin_notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE admin_notifications;
    END IF;
  END IF;
END $$;

-- 2. Ensure REPLICA IDENTITY FULL for detailed change events
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE shops REPLICA IDENTITY FULL;
ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE payouts REPLICA IDENTITY FULL;
ALTER TABLE products REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_notifications') THEN
    ALTER TABLE admin_notifications REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_tickets') THEN
    ALTER TABLE support_tickets REPLICA IDENTITY FULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'logistics_incidents') THEN
    ALTER TABLE logistics_incidents REPLICA IDENTITY FULL;
  END IF;
END $$;

-- 3. Fast Stored Procedure to calculate all admin metrics in a single network roundtrip
CREATE OR REPLACE FUNCTION get_admin_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_revenue numeric := 0;
  v_orders_count bigint := 0;
  v_shops_count bigint := 0;
  v_buyers_count bigint := 0;
  v_pending_payouts bigint := 0;
  v_pending_products bigint := 0;
  v_open_tickets bigint := 0;
  v_open_incidents bigint := 0;
  v_result jsonb;
BEGIN
  -- Sum total revenue & orders count
  SELECT 
    COALESCE(SUM(total_amount), 0), 
    COUNT(id)
  INTO v_revenue, v_orders_count
  FROM orders;

  -- Active shops
  SELECT COUNT(id) INTO v_shops_count
  FROM shops
  WHERE status = 'active';

  -- Registered buyers
  SELECT COUNT(id) INTO v_buyers_count
  FROM profiles
  WHERE role = 'buyer';

  -- Pending payouts
  SELECT COUNT(id) INTO v_pending_payouts
  FROM payouts
  WHERE status = 'pending';

  -- Pending moderation products
  SELECT COUNT(id) INTO v_pending_products
  FROM products
  WHERE moderation_status = 'pending_review';

  -- Open tickets (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_tickets') THEN
    EXECUTE 'SELECT COUNT(id) FROM support_tickets WHERE status = ''open''' INTO v_open_tickets;
  END IF;

  -- Open logistics incidents (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'logistics_incidents') THEN
    EXECUTE 'SELECT COUNT(id) FROM logistics_incidents WHERE status = ''open''' INTO v_open_incidents;
  END IF;

  v_result := jsonb_build_object(
    'total_revenue', v_revenue,
    'total_orders', v_orders_count,
    'active_shops', v_shops_count,
    'total_buyers', v_buyers_count,
    'pending_payouts', v_pending_payouts,
    'pending_products', v_pending_products,
    'open_tickets', v_open_tickets,
    'open_incidents', v_open_incidents,
    'synced_at', now()
  );

  RETURN v_result;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION get_admin_dashboard_metrics() TO authenticated;
