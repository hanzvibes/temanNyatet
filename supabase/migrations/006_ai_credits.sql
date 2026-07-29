-- TemanNyatet — AI credit balances, audit ledger, and atomic RPCs
-- Run this in Supabase SQL Editor after the existing migrations.

CREATE TABLE IF NOT EXISTS public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 10 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount <> 0),
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  reason TEXT NOT NULL,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, reason, reference_id)
);

CREATE INDEX IF NOT EXISTS credit_ledger_user_created_idx
  ON public.credit_ledger(user_id, created_at DESC);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
CREATE POLICY "Users can view own credits" ON public.user_credits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own credit ledger" ON public.credit_ledger;
CREATE POLICY "Users can view own credit ledger" ON public.credit_ledger
  FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT ON public.user_credits, public.credit_ledger TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_credits, public.credit_ledger TO service_role;

CREATE OR REPLACE FUNCTION public.initial_ai_credits()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  -- Configure once per Supabase project with:
  -- ALTER DATABASE postgres SET app.initial_ai_credits = '10';
  -- The server's INITIAL_AI_CREDITS fallback is used only by application
  -- configuration; signup triggers execute inside PostgreSQL.
  SELECT GREATEST(0, COALESCE(NULLIF(current_setting('app.initial_ai_credits', true), '')::INTEGER, 10));
$$;

CREATE OR REPLACE FUNCTION public.ensure_user_credits(target_user_id UUID)
RETURNS public.user_credits
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE result public.user_credits;
BEGIN
  INSERT INTO public.user_credits(user_id, balance)
  VALUES (target_user_id, public.initial_ai_credits())
  ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO result FROM public.user_credits WHERE user_id = target_user_id;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits(user_id, balance)
  VALUES (NEW.id, public.initial_ai_credits())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

CREATE OR REPLACE FUNCTION public.consume_credit(
  target_user_id UUID,
  credit_reason TEXT DEFAULT 'ai_summary',
  credit_reference TEXT DEFAULT NULL
)
RETURNS TABLE (balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE next_balance INTEGER;
BEGIN
  PERFORM public.ensure_user_credits(target_user_id);
  SELECT uc.balance INTO next_balance
  FROM public.user_credits uc
  WHERE uc.user_id = target_user_id
  FOR UPDATE;
  IF next_balance <= 0 THEN
    RAISE EXCEPTION 'CREDITS_EXHAUSTED' USING ERRCODE = 'P0001';
  END IF;
  next_balance := next_balance - 1;
  UPDATE public.user_credits
  SET balance = next_balance, updated_at = now()
  WHERE user_id = target_user_id;
  INSERT INTO public.credit_ledger(user_id, amount, balance_after, reason, reference_id)
  VALUES (target_user_id, -1, next_balance, credit_reason, credit_reference);
  RETURN QUERY SELECT next_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_credit(
  target_user_id UUID,
  credit_amount INTEGER,
  credit_reason TEXT DEFAULT 'payment',
  credit_reference TEXT DEFAULT NULL
)
RETURNS TABLE (balance INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE next_balance INTEGER;
BEGIN
  IF credit_amount <= 0 THEN RAISE EXCEPTION 'Credit amount must be positive'; END IF;
  PERFORM public.ensure_user_credits(target_user_id);
  SELECT uc.balance INTO next_balance FROM public.user_credits uc
  WHERE uc.user_id = target_user_id FOR UPDATE;
  INSERT INTO public.credit_ledger(user_id, amount, balance_after, reason, reference_id)
  VALUES (target_user_id, credit_amount, next_balance + credit_amount, credit_reason, credit_reference)
  ON CONFLICT (user_id, reason, reference_id) DO NOTHING;
  IF NOT FOUND THEN
    RETURN QUERY SELECT next_balance;
    RETURN;
  END IF;
  next_balance := next_balance + credit_amount;
  UPDATE public.user_credits SET balance = next_balance, updated_at = now()
  WHERE user_id = target_user_id;
  RETURN QUERY SELECT next_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_credit_balance(target_user_id UUID)
RETURNS TABLE (balance INTEGER)
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT (public.ensure_user_credits(target_user_id)).balance;
$$;

GRANT EXECUTE ON FUNCTION public.consume_credit(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_credit(UUID, INTEGER, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_credit_balance(UUID) TO service_role;