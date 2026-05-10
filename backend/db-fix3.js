const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });

c.connect().then(async () => {
  // How many rows have large descriptions?
  const large = await c.query(`
    SELECT
      COUNT(*) FILTER (WHERE LENGTH(description) > 500)  AS over_500,
      COUNT(*) FILTER (WHERE LENGTH(description) > 1000) AS over_1000,
      COUNT(*) FILTER (WHERE LENGTH(description) > 2000) AS over_2000,
      SUM(GREATEST(LENGTH(description) - 500, 0))        AS excess_bytes
    FROM votes;
  `);
  const l = large.rows[0];
  console.log('=== OVERSIZED DESCRIPTIONS ===');
  console.log(`  >500 chars:  ${l.over_500} rows`);
  console.log(`  >1000 chars: ${l.over_1000} rows`);
  console.log(`  >2000 chars: ${l.over_2000} rows`);
  console.log(`  Excess bytes if capped at 500: ${(l.excess_bytes/1024/1024).toFixed(1)} MB`);

  // Same for question field
  const largeQ = await c.query(`
    SELECT
      COUNT(*) FILTER (WHERE LENGTH(question) > 200) AS over_200,
      SUM(GREATEST(LENGTH(question) - 200, 0))       AS excess_bytes
    FROM votes;
  `);
  console.log(`\n  question >200 chars: ${largeQ.rows[0].over_200} rows, excess: ${(largeQ.rows[0].excess_bytes/1024).toFixed(0)} KB`);

  // How many votes can safely be trimmed (keep newest 300 per politician)?
  const trimCount = await c.query(`
    SELECT COUNT(*) FROM votes v
    WHERE v.id NOT IN (
      SELECT id FROM votes v2
      WHERE v2.politician_id = v.politician_id
      ORDER BY vote_date DESC NULLS LAST, id DESC
      LIMIT 300
    );
  `);
  console.log(`\n  Rows that would be deleted (keep newest 300/pol): ${trimCount.rows[0].count}`);

}).catch(e => console.error(e.message)).finally(() => c.end());
