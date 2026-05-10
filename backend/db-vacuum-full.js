const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL, statement_timeout: 0 });

c.connect().then(async () => {
  console.log('Running VACUUM FULL on votes table (rewrites file, reclaims OS-level space)...');
  console.log('This may take a few minutes...');
  await c.query('VACUUM FULL votes');
  const r = await c.query(`
    SELECT
      COUNT(*) AS rows,
      pg_size_pretty(pg_relation_size('votes')) AS heap,
      pg_size_pretty(pg_indexes_size('votes')) AS indexes,
      pg_size_pretty(pg_total_relation_size('votes')) AS total,
      pg_size_pretty(pg_database_size(current_database())) AS db_total
    FROM votes
  `);
  const row = r.rows[0];
  console.log('\n=== AFTER VACUUM FULL ===');
  console.log(`  Rows:    ${row.rows}`);
  console.log(`  Heap:    ${row.heap}`);
  console.log(`  Indexes: ${row.indexes}`);
  console.log(`  Table:   ${row.total}`);
  console.log(`  DB:      ${row.db_total}`);
}).catch(e => console.error('ERROR:', e.message)).finally(() => c.end());
