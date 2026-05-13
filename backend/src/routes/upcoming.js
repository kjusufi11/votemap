// src/routes/upcoming.js
const express = require('express');
const router = express.Router();
const NodeCache = require('node-cache');
const db = require('../db');
const { calculateAlignment } = require('../services/alignmentEngine');
const { getRecentBills } = require('../services/congress');

const cache = new NodeCache({ stdTTL: 3600 });

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

// Title-based domain classifier — Congress.gov list responses don't include policyArea.
// Maps bill title keywords → survey priority keys so we can filter without individual fetches.
const TITLE_DOMAIN_KEYWORDS = {
  healthcare:          ['health', 'medicare', 'medicaid', 'drug price', 'hospital', 'opioid', 'vaccine', 'prescription', 'insurance coverage', 'public health', 'mental health'],
  climate:             ['climate', 'environment', 'clean energy', 'renewable', 'carbon', 'emission', 'fossil fuel', 'solar', 'conservation', 'pollution', 'natural gas', 'oil and gas', 'clean water', 'clean air'],
  immigration:         ['immigr', 'border', 'asylum', 'visa', 'deportat', 'citizenship', 'daca', 'refugee', 'customs enforcement', 'undocumented'],
  gun_policy:          ['firearm', 'gun control', 'background check', 'second amendment', 'ammunition', 'assault weapon'],
  taxes:               ['tax cut', 'tax credit', 'tax reform', 'tariff', 'fiscal', 'debt ceiling', 'trade agreement', 'minimum wage', 'labor standard'],
  defense:             ['defense authorization', 'military', 'veteran', 'armed forces', 'national security', 'intelligence', 'nato', 'ukraine', 'israel aid', 'foreign aid'],
  reproductive_rights: ['abortion', 'reproductive', 'contraception', 'planned parenthood', 'fetal', 'family planning'],
  education:           ['education', 'school', 'student loan', 'pell grant', 'college affordability', 'university', 'teacher'],
  safety_net:          ['snap', 'food stamp', 'welfare', 'affordable housing', 'poverty', 'disability benefit', 'social security', 'nutrition', 'child care'],
  criminal_justice:    ['criminal justice', 'police reform', 'prison reform', 'sentencing', 'law enforcement', 'civil rights', 'parole', 'bail reform'],
  voting_rights:       ['voting rights', 'election integrity', 'ballot access', 'voter id', 'campaign finance', 'electoral'],
  infrastructure:      ['infrastructure', 'highway', 'bridge repair', 'broadband', 'public transit', 'transportation', 'rail', 'water system', 'electric grid'],
};

// Classify a bill by its title — returns array of matching survey priority keys
function classifyBillTitle(title) {
  const t = (title || '').toLowerCase();
  const found = new Set();
  for (const [priority, keywords] of Object.entries(TITLE_DOMAIN_KEYWORDS)) {
    if (keywords.some(kw => t.includes(kw))) found.add(priority);
  }
  return [...found];
}

router.get('/', async (req, res) => {
  const { userId } = req.query;

  try {
    // ── Upcoming elections ────────────────────────────────────────────────────
    const currentYear = new Date().getFullYear();
    const electionYears = [String(currentYear), String(currentYear + 1)];

    // Cache elections list — DB data rarely changes, 1-hour TTL
    const electionsKey = `elections_${currentYear}`;
    let politicians = cache.get(electionsKey);
    if (!politicians) {
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
      politicians = [...senateResult.rows, ...houseResult.rows];
      cache.set(electionsKey, politicians, 3600);
    } else {
      politicians = politicians.map(p => ({ ...p })); // clone before mutating with alignment scores
    }

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

    // Cache the shaped bills list — getRecentBills is itself cached by congress.js but
    // the filter + shape loop runs every request. Cache the output for 1 hour.
    const billsKey = 'bills_active_119';
    let allBillsWithRef = cache.get(billsKey);
    if (!allBillsWithRef) {
      let cgBills = [];
      try {
        cgBills = await getRecentBills(119, 90);
      } catch (err) {
        console.warn('[upcoming] Congress.gov bills fetch failed:', err.message);
      }
      const DONE_PATTERN = /signed by the president|became public law|vetoed by the president/i;
      const activeCgBills = cgBills.filter(b => !DONE_PATTERN.test(b.latestAction?.text || ''));
      allBillsWithRef = activeCgBills.slice(0, 200).map(b => {
        const type    = (b.type || '').toLowerCase();
        const number  = String(b.number || '');
        const congress = b.congress || 119;
        const domains  = classifyBillTitle(b.title);
        return {
          id:              `${type}${number}-${congress}`,
          title:           b.title || '',
          short_title:     `${b.type || ''}. ${number}`,
          summary:         null,
          primary_subject: domains[0] || null,
          _domains:        domains,
          introduced_date: b.updateDate || null,
          last_vote_date:  null,
          status:          b.latestAction?.text?.slice(0, 120) || null,
          congress,
          billRef:         type && number ? { type, number, congress } : null,
        };
      });
      cache.set(billsKey, allBillsWithRef, 3600);
    }

    // Filter to user's priority areas (in-memory, fast)
    let billsWithRef = allBillsWithRef;
    if (userPriorities.length > 0) {
      const userPrioritySet = new Set(userPriorities);
      billsWithRef = allBillsWithRef.filter(b =>
        b._domains.some(p => userPrioritySet.has(p))
      );
    }
    // Strip internal _domains field, take top 40
    billsWithRef = billsWithRef.slice(0, 40).map(({ _domains, ...rest }) => rest);

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
