const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await c.connect();

  // Step 1: Delete old votes in batches of 5000 (keep newest 300 per politician)
  console.log('Step 1: Deleting old votes (keeping newest 300 per politician)...');
  let totalDeleted = 0;
  while (true) {
    const res = await c.query(`
      DELETE FROM votes WHERE id IN (
        SELECT id FROM (
          SELECT id,
            ROW_NUMBER() OVER (PARTITION BY politician_id ORDER BY vote_date DESC NULLS LAST, id DESC) AS rn
          FROM votes
        ) ranked
        WHERE rn > 300
        LIMIT 5000
      )
    `);
    totalDeleted += res.rowCount;
    process.stdout.write(`\r  Deleted ${totalDeleted} rows so far...`);
    if (res.rowCount === 0) break;
    // small pause between batches
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`\n  Done. Total deleted: ${totalDeleted}`);

  // Step 2: Truncate oversized descriptions
  console.log('\nStep 2: Truncating long descriptions...');
  const desc = await c.query(`
    UPDATE votes SET description = LEFT(description, 500)
    WHERE LENGTH(description) > 500
  `);
  console.log(`  Updated ${desc.rowCount} rows`);

  // Step 3: VACUUM ANALYZE
  console.log('\nStep 3: Running VACUUM ANALYZE...');
  await c.query('VACUUM ANALYZE votes');
  console.log('  Done.');

  // Step 4: Check new sizes
  const after = await c.query(`
    SELECT
      COUNT(*) AS rows,
      pg_size_pretty(pg_total_relation_size('votes')) AS total_size,
      pg_size_pretty(pg_database_size(current_database())) AS db_size
    FROM votes;
  `);
  const r = after.rows[0];
  console.log(`\n=== AFTER CLEANUP ===`);
  console.log(`  Rows: ${r.rows}`);
  console.log(`  Votes table: ${r.total_size}`);
  console.log(`  DB total: ${r.db_size}`);
}

run().catch(e => console.error('ERROR:', e.message)).finally(() => c.end());
