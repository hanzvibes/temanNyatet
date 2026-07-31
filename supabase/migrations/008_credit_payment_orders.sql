-- TemanNyatet — Migration 008: AI credit payment orders
-- Run this in Supabase SQL Editor after 006_ai_credits.sql and 007_sumopod_payment_orders.sql.

CREATE TABLE IF NOT EXISTS public.credit_payment_orders (
  order_id            TEXT        PRIMARY KEY,
  user_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_email          TEXT        NOT NULL,
  package_id           TEXT        NOT NULL,
  credits              INTEGER     NOT NULL CHECK (credits > 0),
  amount               INTEGER     NOT NULL CHECK (amount > 0),
  currency             TEXT        NOT NULL DEFAULT 'IDR' CHECK (currency = 'IDR'),
  status               TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  sumopod_payment_id  TEXT,
  payment_link_url    TEXT,
  expires_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  granted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS credit_payment_orders_sumopod_payment_id_idx
  ON public.credit_payment_orders(sumopod_payment_id)
  WHERE sumopod_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS credit_payment_orders_user_id_idx
  ON public.credit_payment_orders(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS credit_payment_orders_status_idx
  ON public.credit_payment_orders(status, created_at DESC);

ALTER TABLE public.credit_payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage credit payment orders" ON public.credit_payment_orders;
CREATE POLICY "Service role can manage credit payment orders"
  ON public.credit_payment_orders FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

REVOKE ALL ON public.credit_payment_orders FROM anon, authenticated;
GRANT ALL ON public.credit_payment_orders TO service_role;