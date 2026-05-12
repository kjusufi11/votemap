// src/routes/upcoming.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { calculateAlignment } = require('../services/alignmentEngine');
const { getRecentBills } = require('../services/congress');

// Parse Congress.gov bill type + number from short_title or id
function parseBillRef(short_title, id, congress) {
  if (short_title) {
    const st = short_title.trim();
    const patterns = [
      [/^H\.\s*J\.\s*Res\.?\s*(\d+)$/i,   'hjres'],
      [/^S\.\s*J\.\s*Res\.?\s*(\d+)$/i,   'sjres'],
      [/^H\.\s*Con\.\s*Res\.?\s*(\d+)$/i, 'hconres'],
      [/^S\.\s*Con\.\s*Res\.?\s*(\d+)$/i, 'sconres'],
      [/^H\.\s*Res\.?\s*(\d+)$/i,         'hres'],
      [/^S\.\s*Res\.?\s*(\d+)$/i,         'sres'],
      [/^H\.R\.?\s*(\d+)$/i,              'hr'],
      [/^S\.\s+(\d+)$/i,                  's'],
      [/^S\.(\d+)$/i,                     's'],
    ];
    for (const [re, type] of patterns) {
      const m = st.match(re);
      if (m) return { type, number: m[1], congress: congress || 119 };
    }
  }
  if (id) {
    const m = id.match(/^([a-z]+)(\d+)-(\d+)$/);
    if (m) return { type: m[1], number: m[2], congress: parseInt(m[3]) };
  }
  return null;
}

// Congress.gov policyArea.name → user survey priority keys
const POLICY_AREA_TO_PRIORITY = {
  'Health':                                        ['healthcare'],
  'Medicare':                                      ['healthcare'],
  'Medicaid':                                      ['healthcare'],
  'Opioid Abuse and Addiction':                    ['healthcare'],
  'Environmental Protection':                      ['climate'],
  'Energy':                                        ['climate'],
  'Public Lands and Natural Resources':            ['climate'],
  'Water Resources Development':                   ['climate'],
  'Immigration':                                   ['immigration'],
  'Border Security':                               ['immigration'],
  'Firearms':                                      ['gun_policy'],
  'Crime and Law Enforcement':                     ['criminal_justice', 'gun_policy'],
  'Taxation':                                      ['taxes'],
  'Economics and Public Finance':                  ['taxes'],
  'Commerce':                                      ['taxes'],
  'Finance and Financial Sector':                  ['taxes'],
  'Armed Forces and National Security':            ['defense'],
  'International Affairs':                         ['defense'],
  'Emergency Management':                          ['defense'],
  'Education':                                     ['education'],
  'Sports and Recreation':                         ['education'],
  'Social Welfare':                                ['safety_net'],
  'Housing and Community Development':             ['safety_net'],
  'Labor and Employment':                          ['safety_net'],
  'Families':                                      ['safety_net'],
  'Law':                                           ['criminal_justice'],
  'Civil Rights and Liberties, Minority Issues':   ['criminal_justice', 'reproductive_rights'],
  'Reproductive Rights':                           ['reproductive_rights'],
  'Women':                                         ['reproductive_rights'],
  'Elections':                                     ['voting_rights'],
  'Congress':                                      ['voting_rights'],
  'Transportation and Public Works':               ['infrastructure'],
  'Science, Technology, Communications':           ['infrastructure'],
};

router.get('/', async (req, res) => {
  const { userId } = req.query;

  try {
    // ── Upcoming elections ────────────────────────────────────────────────────
    const currentYear = new Date().getFullYear();
    const electionYears = [String(currentYear), String(currentYear + 1)];

    // Query senate and house separately so senate seats are never truncated by house volume
    const [senateResult, houseResult] = await Promise.all([
      db.query(`
        SELECT id, full_name, first_name, last_name, party, state, chamber,
               district, title, total_votes, party_loyalty_pct, next_election
        FROM politicians
        WHERE in_office = true AND chamber = 'senate' AND next_election = ANY($1)
        ORDER BY state, last_name
      `, [electionYears]),
      db.query(`
        SELECT id, full_name, first_name, last_name, party, state, chamber,
               district, title, total_votes, party_loyalty_pct, next_election
        FROM politicians
        WHERE in_office = true AND chamber = 'house' AND next_election = ANY($1)
        ORDER BY state, last_name
        LIMIT 300
      `, [electionYears]),
    ]);

    let politicians = [...senateResult.rows, ...houseResult.rows];

    // ── Alignment scores for election politicians (if user logged in) ─────────
    if (userId && politicians.length > 0) {
      // Limit to 20 alignment calculations to keep response fast
      const sample = politicians.slice(0, 20);
      await Promise.all(sample.map(async pol => {
        try {
          const result = await calculateAlignment(userId, pol.id);
          pol.alignmentScore = result?.score ?? null;
        } catch {
          pol.alignmentScore = null;
        }
      }));
    }

    // ── Bills to watch — fetch active/upcoming bills from Congress.gov ──────────
    let userPriorities = [];

    if (userId) {
      const surveyResult = await db.query(
        'SELECT importance FROM user_surveys WHERE user_id = $1',
        [String(userId)]
      );
      if (surveyResult.rows[0]?.importance) {
        userPriorities = Object.entries(surveyResult.rows[0].importance)
          .filter(([, v]) => v >= 2)
          .map(([k]) => k);
      }
    }

    // Fetch bills updated in the last 90 days from Congress.gov
    let cgBills = [];
    try {
      cgBills = await getRecentBills(119, 90);
    } catch (err) {
      console.warn('[upcoming] Congress.gov bills fetch failed:', err.message);
    }

    // Exclude already-enacted or vetoed bills — those belong on the President page
    const DONE_PATTERN = /signed by the president|became public law|vetoed by the president/i;
    let activeBills = cgBills.filter(b => !DONE_PATTERN.test(b.latestAction?.text || ''));

    // Filter to user's priority policy areas when logged in
    if (userPriorities.length > 0) {
      const userPrioritySet = new Set(userPriorities);
      activeBills = activeBills.filter(b => {
        const area = b.policyArea?.name || '';
        const domains = POLICY_AREA_TO_PRIORITY[area] || [];
        return domains.some(d => userPrioritySet.has(d));
      });
    }

    // Shape into the format the frontend expects, with billRef pre-attached
    const billsWithRef = activeBills.slice(0, 40).map(b => {
      const type   = (b.type || '').toLowerCase();
      const number = String(b.number || '');
      const congress = b.congress || 119;
      return {
        id:               `${type}${number}-${congress}`,
        title:            b.title || '',
        short_title:      `${b.type || ''}. ${number}`,
        summary:          null,
        primary_subject:  b.policyArea?.name || null,
        introduced_date:  b.introducedDate || null,
        last_vote_date:   null,
        status:           b.latestAction?.text?.slice(0, 120) || null,
        congress,
        billRef:          type && number ? { type, number, congress } : null,
      };
    });

    res.json({
      electionYear: electionYears[0],
      elections: politicians,
      bills: billsWithRef,
      userPriorities,
    });
  } catch (err) {
    console.error('Upcoming route error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
