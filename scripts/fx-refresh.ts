import 'dotenv/config';
import { createDb } from '../src/lib/db';
import { refreshFxRates } from '../src/lib/services/fx';

/**
 * Manual FX refresh: `pnpm fx:refresh`.
 *
 * Uses DATABASE_URL (the pooled HTTP endpoint) rather than DIRECT_URL — unlike
 * sync-permissions this needs no interactive transaction, so there is no reason
 * to open a TCP connection.
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not set');

  const result = await refreshFxRates(createDb(connectionString));
  console.log(
    `FX refresh: ${result.status}` +
      (result.source ? ` via ${result.source}` : '') +
      (result.error ? `\n  error: ${result.error}` : ''),
  );
  if (result.rates) {
    for (const [code, rate] of Object.entries(result.rates)) console.log(`  ${code}: ${rate}`);
  }
  if (result.skipped.length > 0) {
    console.warn(`  skipped (implausible jump): ${result.skipped.join(', ')}`);
  }
  process.exit(result.status === 'success' ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
