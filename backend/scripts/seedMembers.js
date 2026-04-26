// scripts/seedMembers.js
// Run ONCE from your local machine to populate the politicians table
// Usage: node scripts/seedMembers.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const API_KEY = process.env.CONGRESS_API_KEY;
const BASE = 'https://api.congress.gov/v3';

async function fetchAllMembers() {
  const all = [];
  let offset = 0;
  console.log('Fetching all current members of Congress...');
  while (true) {
    const { data } = await axios.get(`${BASE}/member`, {
      params: {
        api_key: API_KEY,
        format: 'json',
        limit: 250,
        offset,
        currentMember: true,
      },
    });
    const members = data.members || [];
    all.push(...members);
    console.log(`  Fetched ${all.length} so far...`);
    if (members.length < 250) break;
    offset += 250;
    await sleep(500);
  }
  return all;
}

async function upsert(m) {
  // Determine chamber from most recent term
  const terms = m.terms?.item || [];
  const lastTerm = terms[terms.length - 1] || {};
  const chamberRaw = lastTerm.chamber || '';
  const chamber = chamberRaw.toLowerCase().includes('senate') ? 'senate' : 'house';
  const district = lastTerm.district || null;
  const state = m.state || lastTerm.stateCode || '';

  const name = m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim();
  const party = normalizeParty(m.partyHistory?.[0]?.partyAbbreviation);

  await pool.query(`
    INSERT INTO politicians
      (id, full_name, first_name, last_name, party, state, chamber,
       district, title, in_office, url, total_votes, missed_votes_pct,
       party_loyalty_pct, last_synced)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,0,0,NOW())
    ON CONFLICT (id) DO UPDATE SET
      full_name=$2, party=$5, state=$6, chamber=$7,
      district=$8, title=$9, in_office=$10, url=$11, last_synced=NOW()
  `, [
    m.bioguideId,
    name,
    m.firstName || name.split(',')[0] || '',
    m.lastName  || name.split(' ').pop() || '',
    party,
    state,
    chamber,
    district,
    chamber === 'senate' ? 'Sen.' : 'Rep.',
    true,
    m.officialWebsiteUrl || null,
  ]);
}

function normalizeParty(p) {
  if (!p) return 'I';
  if (p === 'D') return 'D';
  if (p === 'R') return 'R';
  return 'I';
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log('\nVoteMap — Member Seed Script');
  console.log('============================\n');

  if (!API_KEY || API_KEY.includes('your_')) {
    console.error('ERROR: CONGRESS_API_KEY not set in .env');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost')) {
    console.error('ERROR: DATABASE_URL should point to your Railway database, not localhost');
    process.exit(1);
  }

  try {
    const members = await fetchAllMembers();
    console.log(`\nGot ${members.length} members — saving to database...`);

    let saved = 0, skipped = 0;
    for (const m of members) {
      try {
        await upsert(m);
        saved++;
        process.stdout.write('.');
      } catch (e) {
        skipped++;
        process.stdout.write('x');
      }
    }

    const { rows } = await pool.query('SELECT COUNT(*) FROM politicians');
    console.log(`\n\nDone! Saved: ${saved}, Skipped: ${skipped}`);
    console.log(`Total politicians in DB: ${rows[0].count}`);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\nFatal error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

run();
