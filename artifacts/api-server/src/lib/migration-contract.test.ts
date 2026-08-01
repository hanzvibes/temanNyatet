import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const drizzleDir = join(process.cwd(), '../../lib/db/drizzle');

function readMigration(name: string): string {
  return readFileSync(join(drizzleDir, name), 'utf8');
}

test('latest app-data migration adds PostgreSQL integrity safeguards', () => {
  const migrations = readdirSync(drizzleDir)
    .filter((file) => /^\d{4}_.*\.sql$/.test(file))
    .sort();
  assert.ok(migrations.length >= 3);
  const safeguardMigration = migrations
    .map((name) => ({ name, sql: readMigration(name) }))
    .find(({ sql }) => /transactions_amount_positive/.test(sql));
  assert.ok(safeguardMigration, 'an app-data safeguard migration must exist');
  assert.match(safeguardMigration.sql, /transactions_user_active_date_idx/);
  assert.match(safeguardMigration.sql, /amount.*>.*0/);
  assert.match(safeguardMigration.sql, /CREATE INDEX IF NOT EXISTS/);
  assert.match(safeguardMigration.sql, /IF NOT EXISTS[\s\S]*transactions_amount_positive/);
  assert.doesNotMatch(safeguardMigration.sql, /DROP TABLE|TRUNCATE|DROP DATABASE/i);
});

test('outbox migration keeps the schema and generated SQL aligned', () => {
  const schema = readFileSync(join(process.cwd(), '../../lib/db/src/schema/app-data.ts'), 'utf8');
  const firstMigration = readMigration('0000_cloudy_havok.sql');
  const secondMigration = readMigration('0001_fearless_kabuki.sql');

  assert.match(schema, /syncOutboxTable/);
  assert.match(firstMigration, /CREATE TABLE "sync_outbox"/);
  assert.match(secondMigration, /ALTER TABLE "sync_outbox" DROP COLUMN "deleted_at"/);
  assert.doesNotMatch(schema, /deletedAt:.*timestamps\.deletedAt/);
});