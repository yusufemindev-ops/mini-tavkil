import 'dotenv/config';
import pg from 'pg';
import { PERMISSION_CATALOG, ROLE_GRANTS, ROLE_LABELS } from '../src/lib/permissions/catalog';

/**
 * Syncs the code permission catalog into the database.
 *
 * Tavkil ran this from `onApplicationBootstrap`. Workers have no boot, and
 * CLAUDE.md §8 says nothing runs on boot anyway — so this is a deliberate command:
 *
 *   pnpm sync:permissions
 *
 * It runs over DIRECT_URL with the `pg` TCP driver, not the Neon HTTP driver,
 * precisely because it needs a real interactive transaction: the advisory lock has
 * to be held across every statement. HTTP batching cannot do that (CLAUDE.md §3).
 *
 * This is idempotent reference-data sync, not a schema migration.
 *
 * What it does, in one transaction:
 *   1. upsert every catalog permission, un-deprecating any that reappeared
 *   2. mark database permissions no longer in the catalog as deprecated — kept,
 *      not deleted, because a grant row may still reference them
 *   3. drop role grants pointing at deprecated permissions, so a role's effective
 *      permission set stays accurate
 *   4. re-label the three fixed roles and apply the seed grants, additively
 */

// Arbitrary app-wide constant. Any concurrent run takes the same lock and waits.
const SYNC_LOCK_KEY = 472947;

async function main() {
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) throw new Error('DIRECT_URL is not set');

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [SYNC_LOCK_KEY]);

    const codes = PERMISSION_CATALOG.map((permission) => permission.code);

    for (const permission of PERMISSION_CATALOG) {
      await client.query(
        `INSERT INTO permissions (code, domain, name, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE
           SET domain = EXCLUDED.domain,
               name = EXCLUDED.name,
               description = EXCLUDED.description,
               deprecated = false`,
        [permission.code, permission.domain, permission.name, permission.description],
      );
    }

    const deprecated = await client.query(
      `UPDATE permissions SET deprecated = true
        WHERE deprecated = false AND code <> ALL($1::text[])`,
      [codes],
    );

    await client.query(
      `DELETE FROM role_permissions rp
        USING permissions p
        WHERE rp.permission_id = p.id AND p.deprecated = true`,
    );

    // Keep the three fixed roles' labels in step with the code. The rows already
    // exist from the Tavkil migration; this only renames them.
    for (const [code, label] of Object.entries(ROLE_LABELS)) {
      await client.query(`UPDATE roles SET name = $2, updated_at = now() WHERE code = $1`, [
        code,
        label,
      ]);
    }

    let granted = 0;
    for (const [roleCode, permissionCodes] of Object.entries(ROLE_GRANTS)) {
      const role = await client.query<{ id: string }>('SELECT id FROM roles WHERE code = $1', [
        roleCode,
      ]);
      if (role.rowCount === 0) {
        console.warn(`  ! role "${roleCode}" not found — skipping its grants`);
        continue;
      }
      const result = await client.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT $1, p.id FROM permissions p WHERE p.code = ANY($2::text[])
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [role.rows[0].id, permissionCodes],
      );
      granted += result.rowCount ?? 0;
    }

    await client.query('COMMIT');

    console.log(
      `Permissions synced: ${codes.length} in catalog, ${deprecated.rowCount ?? 0} newly deprecated, ` +
        `${granted} new grants across ${Object.keys(ROLE_GRANTS).length} roles ` +
        `(Owner resolves to a wildcard and needs none).`,
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
