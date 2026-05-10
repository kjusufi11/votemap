const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });

c.connect().then(async () => {
  const sizes = await c.query(`
    SELECT
      relname AS table_name,
      pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
      pg_size_pretty(pg_relation_size(relid)) AS table_size,
      pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size,
      n_live_tup AS row_count
    FROM pg_stat_user_tables
    ORDER BY pg_total_relation_size(relid) DESC;
  `);
  console.log('=== TABLE SIZES ===');
  sizes.rows.forEach(r => console.log(`${r.table_name.padEnd(25)} total=${r.total_size.padStart(10)}  rows=${r.row_count}`));

  const db = await c.query(`SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;`);
  console.log('\n=== DATABASE TOTAL ===');
  console.log(db.rows[0].db_size);

  const bloat = await c.query(`
    SELECT relname, n_dead_tup, n_live_tup,
      ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 1) AS dead_pct
    FROM pg_stat_user_tables
    WHERE n_dead_tup > 1000
    ORDER BY n_dead_tup DESC;
  `);
  if (bloat.rows.length) {
    console.log('\n=== DEAD TUPLES (bloat) ===');
    bloat.rows.forEach(r => console.log(`${r.relname.padEnd(25)} dead=${r.n_dead_tup}  live=${r.n_live_tup}  dead%=${r.dead_pct}`));
  }
}).catch(e => console.error(e.message)).finally(() => c.end());
