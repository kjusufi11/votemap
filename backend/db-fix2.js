const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });

c.connect().then(async () => {
  // Average row size breakdown
  const rowSize = await c.query(`
    SELECT
      AVG(LENGTH(question)) AS avg_question,
      AVG(LENGTH(description)) AS avg_description,
      MAX(LENGTH(question)) AS max_question,
      MAX(LENGTH(description)) AS max_description
    FROM votes;
  `);
  console.log('=== FIELD SIZES (bytes) ===');
  const r = rowSize.rows[0];
  console.log(`  question:    avg=${Math.round(r.avg_question)}  max=${r.max_question}`);
  console.log(`  description: avg=${Math.round(r.avg_description)}  max=${r.max_description}`);

  // Date range of votes
  const dates = await c.query(`SELECT MIN(vote_date) AS oldest, MAX(vote_date) AS newest FROM votes;`);
  console.log(`\n=== DATE RANGE ===`);
  console.log(`  Oldest: ${dates.rows[0].oldest?.toISOString().slice(0,10)}`);
  console.log(`  Newest: ${dates.rows[0].newest?.toISOString().slice(0,10)}`);

  // How many votes are older than 12 months?
  const old = await c.query(`SELECT COUNT(*) FROM votes WHERE vote_date < NOW() - INTERVAL '12 months';`);
  console.log(`\n  Votes older than 12 months: ${old.rows[0].count}`);

  // How many votes per politician on average / min / max?
  const perPol = await c.query(`
    SELECT MIN(cnt) AS min, MAX(cnt) AS max, ROUND(AVG(cnt)) AS avg
    FROM (SELECT politician_id, COUNT(*) AS cnt FROM votes GROUP BY politician_id) sub;
  `);
  console.log(`\n=== VOTES PER POLITICIAN ===`);
  console.log(`  min=${perPol.rows[0].min}  avg=${perPol.rows[0].avg}  max=${perPol.rows[0].max}`);

  // Disk usage breakdown
  const disk = await c.query(`
    SELECT
      pg_size_pretty(pg_database_size(current_database())) AS db_total,
      pg_size_pretty(pg_relation_size('votes')) AS votes_heap,
      pg_size_pretty(pg_indexes_size('votes')) AS votes_indexes,
      pg_size_pretty(pg_relation_size('votes') + pg_indexes_size('votes')) AS votes_total;
  `);
  console.log(`\n=== VOTES DISK BREAKDOWN ===`);
  console.log(`  heap=${disk.rows[0].votes_heap}  indexes=${disk.rows[0].votes_indexes}  total=${disk.rows[0].votes_total}`);
  console.log(`  DB total: ${disk.rows[0].db_total}`);

}).catch(e => console.error(e.message)).finally(() => c.end());
