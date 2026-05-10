const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });

c.connect().then(async () => {
  // Check votes table columns
  const cols = await c.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'votes'
    ORDER BY ordinal_position;
  `);
  console.log('=== VOTES COLUMNS ===');
  cols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

  // Check existing constraints/indexes on votes
  const idx = await c.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'votes';
  `);
  console.log('\n=== VOTES INDEXES ===');
  idx.rows.forEach(r => console.log(`  ${r.indexname}: ${r.indexdef}`));

  // Count total vs distinct votes
  const counts = await c.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(DISTINCT (politician_id, vote_date, description)) AS distinct_by_desc,
      COUNT(DISTINCT (politician_id, question)) AS distinct_by_question
    FROM votes;
  `);
  console.log('\n=== ROW COUNTS ===');
  console.log(`  Total rows:              ${counts.rows[0].total}`);
  console.log(`  Distinct (pol+date+desc): ${counts.rows[0].distinct_by_desc}`);
  console.log(`  Distinct (pol+question):  ${counts.rows[0].distinct_by_question}`);

  // Sample a few votes to understand the data
  const sample = await c.query(`SELECT id, politician_id, vote_date, position, question FROM votes LIMIT 3;`);
  console.log('\n=== SAMPLE ROWS ===');
  sample.rows.forEach(r => console.log(`  id=${r.id} pol=${r.politician_id} date=${r.vote_date} pos=${r.position} q="${String(r.question).slice(0,60)}"`));

}).catch(e => console.error(e.message)).finally(() => c.end());
