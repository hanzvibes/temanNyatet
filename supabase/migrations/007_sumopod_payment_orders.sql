-- ============================================================
-- TemanNyatet — Migration 007: SumoPod payment orders
-- Run this in Supabase SQL Editor before enabling SumoPod checkout.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_subscription_order_id TEXT;

CREATE TABLE IF NOT EXISTS public.payment_orders (
  order_id            TEXT        PRIMARY KEY,
  user_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_email          TEXT        NOT NULL,
  plan                TEXT        NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  amount              INTEGER     NOT NULL CHECK (amount > 0),
  currency            TEXT        NOT NULL DEFAULT 'IDR' CHECK (currency = 'IDR'),
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  sumopod_payment_id  TEXT,
  payment_link_url    TEXT,
  expires_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_sumopod_payment_id_idx
  ON public.payment_orders(sumopod_payment_id)
  WHERE sumopod_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_orders_user_id_idx
  ON public.payment_orders(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS payment_orders_status_idx
  ON public.payment_orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS profiles_last_subscription_order_id_idx
  ON public.profiles(last_subscription_order_id)
  WHERE last_subscription_order_id IS NOT NULL;

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage payment orders" ON public.payment_orders;
CREATE POLICY "Service role can manage payment orders"
  ON public.payment_orders FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON public.payment_orders FROM anon, authenticated;
GRANT ALL ON public.payment_orders TO service_role;