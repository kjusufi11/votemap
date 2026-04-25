// src/routes/politicians.js
// GET  /api/politicians/:id           — full politician profile
// GET  /api/politicians/:id/votes     — paginated vote history
// POST /api/politicians/:id/analyze   — trigger AI bias analysis
// GET  /api/politicians/:id/analysis  — get cached bias analysis

const express = require('express');
const router = express.Router();
const db = require('../db');
const biasEngine = require('../services/biasEngine');
const sync = require('../services/sync');
const mockData = require('../services/mockData');

// GET /api/politicians/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  // Mock mode
  if (mockData.isMockMode()) {
    const pol = mockData.MOCK_POLITICIANS[id];
    if (!pol) return res.status(404).json({ error: 'Politician not found.' });
    const bias_scores = mockData.MOCK_BIAS_SCORES[id] || [];
    return res.json({ ...pol, bias_scores });
  }

  try {
    const result = await db.query(`
      SELECT
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'category', bs.category,
              'label', bs.label,
              'score', bs.score,
              'direction', bs.direction,
              'confidence', bs.confidence,
              'vote_count', bs.vote_count,
              'summary', bs.summary
            ) ORDER BY bs.score DESC
          ) FILTER (WHERE bs.category IS NOT NULL),
          '[]'
        ) as bias_scores
      FROM politicians p
      LEFT JOIN bias_scores bs ON bs.politician_id = p.id
      WHERE p.id = $1
      GROUP BY p.id
    `, [id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Politician not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/politicians/:id/votes?page=0&subject=
router.get('/:id/votes', async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page || 0);
  const subject = req.query.subject || null;

  // Mock mode
  if (mockData.isMockMode()) {
    return res.json(mockData.getMockVotes(id, page));
  }
  const limit = 25;
  const offset = page * limit;

  try {
    const params = [id, limit, offset];
    let subjectFilter = '';
    if (subject) {
      params.push(subject);
      subjectFilter = `AND (b.primary_subject ILIKE $${params.length} OR $${params.length} = ANY(b.categories))`;
    }

    const result = await db.query(`
      SELECT
        v.id, v.position, v.question, v.description, v.vote_date, v.congress,
        b.title, b.short_title, b.primary_subject, b.categories, b.number
      FROM votes v
      LEFT JOIN bills b ON v.bill_id = b.id
      WHERE v.politician_id = $1
      ${subjectFilter}
      ORDER BY v.vote_date DESC NULLS LAST
      LIMIT $2 OFFSET $3
    `, params);

    const countResult = await db.query(
      'SELECT COUNT(*) FROM votes WHERE politician_id = $1',
      [id]
    );

    res.json({
      votes: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/politicians/:id/analyze
// Triggers (or re-triggers) AI bias analysis. Returns immediately if cached.
router.post('/:id/analyze', async (req, res) => {
  const { id } = req.params;
  const forceRefresh = req.query.refresh === 'true';

  try {
    // Ensure we have vote data first
    const voteCount = await db.query(
      'SELECT COUNT(*) FROM votes WHERE politician_id = $1', [id]
    );

    if (parseInt(voteCount.rows[0].count) < 10) {
      // Trigger a sync first
      await sync.syncVotesForPolitician(id, 5);
    }

    const analysis = await biasEngine.analyzePolitician(id, forceRefresh);
    res.json({ success: true, analysis });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/politicians/:id/analysis
router.get('/:id/analysis', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(`
      SELECT content, computed_at FROM ai_analysis
      WHERE politician_id = $1 AND analysis_type = 'full_profile'
    `, [id]);

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'No analysis yet.',
        hint: `POST /api/politicians/${id}/analyze to generate one.`
      });
    }

    res.json({
      analysis: result.rows[0].content,
      computedAt: result.rows[0].computed_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/politicians/search?q=pelosi&state=CA&chamber=house
router.get('/', async (req, res) => {
  const { q, state, chamber, party } = req.query;

  try {
    const conditions = ['p.in_office = true'];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`p.full_name ILIKE $${params.length}`);
    }
    if (state) {
      params.push(state.toUpperCase());
      conditions.push(`p.state = $${params.length}`);
    }
    if (chamber) {
      params.push(chamber.toLowerCase());
      conditions.push(`p.chamber = $${params.length}`);
    }
    if (party) {
      params.push(party.toUpperCase());
      conditions.push(`p.party = $${params.length}`);
    }

    const result = await db.query(`
      SELECT id, full_name, party, state, chamber, district, title,
             total_votes, party_loyalty_pct, dw_nominate
      FROM politicians p
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.last_name
      LIMIT 50
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
