-- TemanNyatet — cached AI transaction summaries
-- Stores the latest generated result for each authenticated user and period.

CREATE TABLE IF NOT EXISTS public.transaction_summary_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('week', 'month', 'custom')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  comparison_start DATE NOT NULL,
  comparison_end DATE NOT NULL,
  headline TEXT NOT NULL,
  totals JSONB NOT NULL,
  top_expense_categories JSONB NOT NULL,
  comparison JSONB NOT NULL,
  insights JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_type, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS transaction_summary_cache_user_period_idx
  ON public.transaction_summary_cache(user_id, period_start DESC, period_end DESC);

ALTER TABLE public.transaction_summary_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transaction summaries"
  ON public.transaction_summary_cache;
CREATE POLICY "Users can view own transaction summaries"
  ON public.transaction_summary_cache
  FOR SELECT USING (auth.uid() = user_id);

GRANT SELECT ON public.transaction_summary_cache TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transaction_summary_cache TO service_role;

DROP TRIGGER IF EXISTS transaction_summary_cache_updated_at
  ON public.transaction_summary_cache;
CREATE TRIGGER transaction_summary_cache_updated_at
  BEFORE UPDATE ON public.transaction_summary_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AI output, cache upsert, credit debit, and immutable ledger entry must share
-- one transaction. The request reference makes browser retries idempotent.
CREATE OR REPLACE FUNCTION public.consume_and_cache_transaction_summary(
  target_user_id UUID,
  credit_reference TEXT,
  summary_period_type TEXT,
  summary_period_start DATE,
  summary_period_end DATE,
  summary_comparison_start DATE,
  summary_comparison_end DATE,
  summary_headline TEXT,
  summary_totals JSONB,
  summary_top_expense_categories JSONB,
  summary_comparison JSONB,
  summary_insights JSONB
)
RETURNS TABLE (balance INTEGER, summary JSONB)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  next_balance INTEGER;
  cached_summary JSONB;
BEGIN
  IF nullif(trim(credit_reference), '') IS NULL THEN
    RAISE EXCEPTION 'credit_reference is required';
  END IF;

  PERFORM public.ensure_user_credits(target_user_id);
  SELECT uc.balance INTO current_balance
  FROM public.user_credits uc
  WHERE uc.user_id = target_user_id
  FOR UPDATE;

  -- A completed request is safe to replay: return its current balance and
  -- persisted summary without creating another ledger debit.
  IF EXISTS (
    SELECT 1
    FROM public.credit_ledger cl
    WHERE cl.user_id = target_user_id
      AND cl.reason = 'ai_transaction_summary'
      AND cl.reference_id = credit_reference
  ) THEN
    SELECT to_jsonb(tsc) INTO cached_summary
    FROM public.transaction_summary_cache tsc
    WHERE tsc.user_id = target_user_id
      AND tsc.period_type = summary_period_type
      AND tsc.period_start = summary_period_start
      AND tsc.period_end = summary_period_end;
    RETURN QUERY SELECT current_balance, cached_summary;
    RETURN;
  END IF;

  IF current_balance <= 0 THEN
    RAISE EXCEPTION 'CREDITS_EXHAUSTED' USING ERRCODE = 'P0001';
  END IF;

  next_balance := current_balance - 1;

  INSERT INTO public.transaction_summary_cache (
    user_id, period_type, period_start, period_end,
    comparison_start, comparison_end, headline, totals,
    top_expense_categories, comparison, insights, updated_at
  )
  VALUES (
    target_user_id, summary_period_type, summary_period_start, summary_period_end,
    summary_comparison_start, summary_comparison_end, summary_headline, summary_totals,
    summary_top_expense_categories, summary_comparison, summary_insights, now()
  )
  ON CONFLICT (user_id, period_type, period_start, period_end)
  DO UPDATE SET
    comparison_start = EXCLUDED.comparison_start,
    comparison_end = EXCLUDED.comparison_end,
    headline = EXCLUDED.headline,
    totals = EXCLUDED.totals,
    top_expense_categories = EXCLUDED.top_expense_categories,
    comparison = EXCLUDED.comparison,
    insights = EXCLUDED.insights,
    updated_at = now();

  INSERT INTO public.credit_ledger (
    user_id, amount, balance_after, reason, reference_id
  )
  VALUES (
    target_user_id, -1, next_balance, 'ai_transaction_summary', credit_reference
  );

  UPDATE public.user_credits
  SET balance = next_balance, updated_at = now()
  WHERE user_id = target_user_id;

  SELECT to_jsonb(tsc) INTO cached_summary
  FROM public.transaction_summary_cache tsc
  WHERE tsc.user_id = target_user_id
    AND tsc.period_type = summary_period_type
    AND tsc.period_start = summary_period_start
    AND tsc.period_end = summary_period_end;

  RETURN QUERY SELECT next_balance, cached_summary;
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_and_cache_transaction_summary(
  UUID, TEXT, TEXT, DATE, DATE, DATE, DATE, TEXT, JSONB, JSONB, JSONB, JSONB
) TO service_role;