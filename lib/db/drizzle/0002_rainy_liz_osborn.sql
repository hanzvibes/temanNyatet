CREATE INDEX IF NOT EXISTS "transactions_user_active_date_idx" ON "transactions" USING btree ("user_id","deleted_at","date");--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_amount_positive'
      AND conrelid = 'transactions'::regclass
  ) THEN
    ALTER TABLE "transactions"
      ADD CONSTRAINT "transactions_amount_positive"
      CHECK ("transactions"."amount" > 0);
  END IF;
END $$;