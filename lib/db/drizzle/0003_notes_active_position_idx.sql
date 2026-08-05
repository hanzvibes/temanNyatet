CREATE INDEX IF NOT EXISTS "notes_user_active_position_idx"
  ON "notes" USING btree ("user_id","deleted_at","position","created_at");