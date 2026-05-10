const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });

c.connect().then(async () => {
  // Step 1: count null vote_ids
  const nullCount = await c.query(`SELECT COUNT(*) FROM votes WHERE vote_id IS NULL;`);
  console.log(`Votes with null vote_id: ${nullCount.rows[0].count}`);

  // Step 2: count votes for politicians not in_office (dead data)
  const outOfOffice = await c.query(`
    SELECT COUNT(*) FROM votes v
    WHERE NOT EXISTS (SELECT 1 FROM politicians p WHERE p.id = v.politician_id AND p.in_office = true);
  `);
  console.log(`Votes for non-in-office politicians: ${outOfOffice.rows[0].count}`);

  // Step 3: check how many politicians have >600 votes (sync ran multiple times)
  const over600 = await c.query(`
    SELECT COUNT(*) AS politicians, SUM(vote_count) AS total_votes FROM (
      SELECT politician_id, COUNT(*) AS vote_count
      FROM votes
      GROUP BY politician_id
      HAVING COUNT(*) > 600
    ) sub;
  `);
  console.log(`Politicians with >600 votes: ${over600.rows[0].politicians}, total votes: ${over600.rows[0].total_votes}`);

}).catch(e => console.error(e.message)).finally(() => c.end());
