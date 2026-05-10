const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });

c.connect().then(async () => {
  // Congress distribution
  const congress = await c.query(`
    SELECT congress, COUNT(*) AS votes
    FROM votes
    GROUP BY congress
    ORDER BY congress DESC;
  `);
  console.log('=== VOTES BY CONGRESS ===');
  congress.rows.forEach(r => console.log(`  Congress ${String(r.congress).padStart(3)}: ${r.votes} votes`));

  // Top 10 politicians by vote count
  const topPols = await c.query(`
    SELECT p.full_name, p.state, p.chamber, COUNT(v.id) AS votes
    FROM votes v
    JOIN politicians p ON p.id = v.politician_id
    GROUP BY p.id
    ORDER BY COUNT(v.id) DESC
    LIMIT 10;
  `);
  console.log('\n=== TOP 10 POLITICIANS BY VOTE COUNT ===');
  topPols.rows.forEach(r => console.log(`  ${r.full_name.padEnd(30)} ${r.chamber.padEnd(8)} ${r.state}  ${r.votes} votes`));

  // Check for duplicate votes (same politician + roll_call or description + date)
  const dups = await c.query(`
    SELECT politician_id, vote_date, description, COUNT(*) AS cnt
    FROM votes
    GROUP BY politician_id, vote_date, description
    HAVING COUNT(*) > 1
    LIMIT 5;
  `);
  console.log(`\n=== DUPLICATE VOTES (sample) ===`);
  console.log(`  Duplicate groups: (showing first 5)`);
  dups.rows.forEach(r => console.log(`  politician=${r.politician_id} date=${r.vote_date} cnt=${r.cnt} desc="${String(r.description).slice(0,60)}"`));

  // Total duplicates
  const dupCount = await c.query(`
    SELECT SUM(cnt - 1) AS duplicate_rows FROM (
      SELECT COUNT(*) AS cnt
      FROM votes
      GROUP BY politician_id, vote_date, description
      HAVING COUNT(*) > 1
    ) sub;
  `);
  console.log(`  Total duplicate rows: ${dupCount.rows[0].duplicate_rows}`);

  // Oldest congress with in-office politicians
  const oldCongress = await c.query(`
    SELECT MIN(v.congress) AS oldest, MAX(v.congress) AS newest
    FROM votes v
    JOIN politicians p ON p.id = v.politician_id
    WHERE p.in_office = true;
  `);
  console.log(`\n=== CONGRESS RANGE (in-office politicians only) ===`);
  console.log(`  Oldest: ${oldCongress.rows[0].oldest}  Newest: ${oldCongress.rows[0].newest}`);

}).catch(e => console.error(e.message)).finally(() => c.end());
