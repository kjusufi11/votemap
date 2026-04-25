// src/services/sync.js
// Syncs politicians and their votes from ProPublica into our database.
// Run manually or via a cron job (e.g. nightly at 2am).

const propublica = require('./propublica');
const db = require('../db');

const CURRENT_CONGRESS = 119; // Update each new Congress

// ── Sync members ──────────────────────────────────────────────────────────────

async function syncMembers(chamber = 'both') {
  const chambers = chamber === 'both' ? ['senate', 'house'] : [chamber];
  let total = 0;

  for (const ch of chambers) {
    console.log(`  Syncing ${ch} members...`);
    const [result] = await propublica.getMembers(CURRENT_CONGRESS, ch);
    if (!result?.members) continue;

    for (const member of result.members) {
      const normalized = propublica.normalizeMember(member, ch);
      await db.query(`
        INSERT INTO politicians (
          id, full_name, first_name, last_name, party, state, chamber, district,
          title, in_office, dw_nominate, next_election, twitter_handle, url,
          total_votes, missed_votes_pct, party_loyalty_pct, last_synced
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          full_name=$2, party=$5, in_office=$10, dw_nominate=$11,
          total_votes=$15, missed_votes_pct=$16, party_loyalty_pct=$17,
          last_synced=NOW()
      `, [
        normalized.id, normalized.full_name, normalized.first_name, normalized.last_name,
        normalized.party, normalized.state, normalized.chamber, normalized.district,
        normalized.title, normalized.in_office, normalized.dw_nominate,
        normalized.next_election, normalized.twitter_handle, normalized.url,
        normalized.total_votes, normalized.missed_votes_pct, normalized.party_loyalty_pct,
      ]);
      total++;
    }
    console.log(`    ✓ Synced ${result.members.length} ${ch} members`);
  }

  return total;
}

// ── Sync votes for a politician ───────────────────────────────────────────────

async function syncVotesForPolitician(politicianId, pages = 3) {
  let totalSynced = 0;

  for (let page = 0; page < pages; page++) {
    const offset = page * 20;
    const [result] = await propublica.getMemberVotes(politicianId, offset);
    if (!result?.votes?.length) break;

    for (const vote of result.votes) {
      // Upsert bill if we have bill info
      let billId = null;
      if (vote.bill?.bill_id) {
        billId = `${vote.bill.bill_id}-${CURRENT_CONGRESS}`;
        await db.query(`
          INSERT INTO bills (id, bill_id, number, title, short_title, primary_subject, congress)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO NOTHING
        `, [
          billId,
          vote.bill.bill_id,
          vote.bill.number || null,
          vote.description || vote.question,
          vote.bill.title || null,
          vote.bill.primary_subject || null,
          CURRENT_CONGRESS,
        ]);
      }

      // Upsert vote
      const normalized = propublica.normalizeVote(vote, politicianId);
      await db.query(`
        INSERT INTO votes (politician_id, bill_id, vote_id, position, question, description, vote_date, session, congress)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (politician_id, vote_id) DO NOTHING
      `, [
        normalized.politician_id, billId, normalized.vote_id,
        normalized.position, normalized.question, normalized.description,
        normalized.vote_date, normalized.session, normalized.congress,
      ]);
      totalSynced++;
    }

    // Rate limit: ProPublica allows ~1 req/sec on free tier
    if (page < pages - 1) await sleep(1100);
  }

  return totalSynced;
}

// ── Sync representatives for a user's location ───────────────────────────────
// Called when a user first looks up their ZIP — ensures those specific
// politicians are in our DB with fresh vote data

async function syncRepresentatives(state, district) {
  const synced = [];

  // Always sync both senators
  try {
    const senators = await propublica.getSenatorsByState(state);
    for (const senator of senators || []) {
      await syncSingleMember(senator.id || senator, 'senate');
      synced.push(senator.id || senator);
    }
  } catch (err) {
    console.warn(`Could not sync senators for ${state}:`, err.message);
  }

  // Sync the House rep for this district
  if (district) {
    try {
      const reps = await propublica.getRepByDistrict(state, district);
      for (const rep of reps || []) {
        await syncSingleMember(rep.id || rep, 'house');
        synced.push(rep.id || rep);
      }
    } catch (err) {
      console.warn(`Could not sync rep for ${state}-${district}:`, err.message);
    }
  }

  return synced;
}

async function syncSingleMember(bioguideId, chamber) {
  // Check if already recently synced
  const existing = await db.query(
    'SELECT last_synced FROM politicians WHERE id = $1',
    [bioguideId]
  );

  const lastSynced = existing.rows[0]?.last_synced;
  const staleHours = 24;
  if (lastSynced && (Date.now() - new Date(lastSynced)) < staleHours * 3600 * 1000) {
    return; // Fresh enough
  }

  // Sync member profile
  try {
    const member = await propublica.getMember(bioguideId);
    if (!member) return;

    const normalized = propublica.normalizeMember(member, chamber || member.roles?.[0]?.chamber || 'house');
    await db.query(`
      INSERT INTO politicians (
        id, full_name, first_name, last_name, party, state, chamber, district,
        title, in_office, dw_nominate, next_election, twitter_handle, url,
        total_votes, missed_votes_pct, party_loyalty_pct, last_synced
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW())
      ON CONFLICT (id) DO UPDATE SET
        full_name=$2, party=$5, in_office=$10, dw_nominate=$11,
        total_votes=$15, missed_votes_pct=$16, party_loyalty_pct=$17, last_synced=NOW()
    `, [
      normalized.id, normalized.full_name, normalized.first_name, normalized.last_name,
      normalized.party, normalized.state, normalized.chamber, normalized.district,
      normalized.title, normalized.in_office, normalized.dw_nominate,
      normalized.next_election, normalized.twitter_handle, normalized.url,
      normalized.total_votes, normalized.missed_votes_pct, normalized.party_loyalty_pct,
    ]);
  } catch (err) {
    console.warn(`Could not sync member profile ${bioguideId}:`, err.message);
  }

  // Sync their recent votes (last 3 pages = ~60 votes)
  try {
    await syncVotesForPolitician(bioguideId, 3);
  } catch (err) {
    console.warn(`Could not sync votes for ${bioguideId}:`, err.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  syncMembers,
  syncVotesForPolitician,
  syncRepresentatives,
  syncSingleMember,
  CURRENT_CONGRESS,
};
