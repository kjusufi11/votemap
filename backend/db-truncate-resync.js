const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });

c.connect().then(async () => {
  const before = await c.query(`SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size`);
  console.log(`DB before: ${before.rows[0].db_size}`);

  // TRUNCATE frees space immediately (unlike DELETE)
  console.log('Truncating votes table...');
  await c.query('TRUNCATE votes');

  // Reset stats so sync-zero-votes endpoint picks everyone up
  console.log('Resetting total_votes to 0 for all politicians...');
  await c.query('UPDATE politicians SET total_votes = 0, last_synced = NULL');

  const after = await c.query(`
    SELECT
      (SELECT COUNT(*) FROM votes) AS vote_rows,
      (SELECT COUNT(*) FROM politicians WHERE total_votes = 0) AS pols_pending_sync,
      pg_size_pretty(pg_database_size(current_database())) AS db_size
  `);
  const r = after.rows[0];
  console.log(`\n=== AFTER ===`);
  console.log(`  Vote rows:           ${r.vote_rows}`);
  console.log(`  Politicians to sync: ${r.pols_pending_sync}`);
  console.log(`  DB size:             ${r.db_size}`);
  console.log('\nDone. Trigger POST /api/politicians/sync-zero-votes?limit=50 to start re-syncing.');
}).catch(e => console.error('ERROR:', e.message)).finally(() => c.end());
