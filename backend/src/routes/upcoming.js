// src/routes/upcoming.js
// GET /api/upcoming?userId=X
// Returns upcoming elections (politicians with next_election matching current/next year)
// and recently active bills in the user's priority issue areas.

const express = require('express');
const router = express.Router();
const db = require('../db');
const { calculateAlignment } = require('../services/alignmentEngine');

// Maps user survey issue keys → ProPublica primary_subject values stored in bills table
const PRIORITY_TO_SUBJECTS = {
  healthcare:          ['Health', 'Medicare', 'Medicaid', 'Opioid Abuse'],
  climate:             ['Environmental Protection', 'Energy', 'Public Lands and Natural Resources', 'Water Resources Development'],
  immigration:         ['Immigration', 'Border Security'],
  gun_policy:          ['Crime and Law Enforcement', 'Firearms'],
  taxes:               ['Taxation', 'Economics and Public Finance'],
  defense:             ['Armed Forces and National Security', 'International Affairs', 'Emergency Management'],
  reproductive_rights: ['Civil Rights and Liberties, Minority Issues', 'Health'],
  education:           ['Education', 'Education Sciences and Education'],
  safety_net:          ['Social Welfare', 'Housing and Community Development', 'Labor and Employment'],
  criminal_justice:    ['Crime and Law Enforcement', 'Law', 'Civil Rights and Liberties, Minority Issues'],
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

    // ── Bills to watch (user priorities) ─────────────────────────────────────
    let bills = [];
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

    const subjectSet = new Set();
    for (const priority of userPriorities) {
      for (const s of (PRIORITY_TO_SUBJECTS[priority] || [])) subjectSet.add(s);
    }

    if (subjectSet.size > 0) {
      const subjects = Array.from(subjectSet);
      const billsResult = await db.query(`
        SELECT b.id, b.bill_id, b.number, b.title, b.short_title, b.primary_subject,
               b.categories, b.introduced_date, b.last_vote_date, b.status, b.congress,
               MAX(v.vote_date) AS latest_vote_date
        FROM bills b
        JOIN votes v ON v.bill_id = b.id
        WHERE b.primary_subject = ANY($1)
        GROUP BY b.id
        ORDER BY MAX(v.vote_date) DESC NULLS LAST
        LIMIT 30
      `, [subjects]);
      bills = billsResult.rows.map(r => ({ ...r, last_vote_date: r.last_vote_date || r.latest_vote_date }));
    } else {
      // No priorities — show most recently voted-on bills
      const billsResult = await db.query(`
        SELECT b.id, b.bill_id, b.number, b.title, b.short_title, b.primary_subject,
               b.categories, b.introduced_date, b.last_vote_date, b.status, b.congress,
               MAX(v.vote_date) AS latest_vote_date
        FROM bills b
        JOIN votes v ON v.bill_id = b.id
        GROUP BY b.id
        ORDER BY MAX(v.vote_date) DESC NULLS LAST
        LIMIT 30
      `);
      bills = billsResult.rows.map(r => ({ ...r, last_vote_date: r.last_vote_date || r.latest_vote_date }));
    }

    res.json({
      electionYear: electionYears[0],
      elections: politicians,
      bills,
      userPriorities,
    });
  } catch (err) {
    console.error('Upcoming route error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
