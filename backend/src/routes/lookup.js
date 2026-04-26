// src/routes/lookup.js
// POST /api/lookup/zip — resolves ZIP to representatives using our DB

const express = require('express');
const router  = express.Router();
const geocode  = require('../services/geocode');
const db       = require('../db');
const mockData = require('../services/mockData');

router.post('/zip', async (req, res) => {
  const { zip } = req.body;

  if (!zip || !/^\d{5}$/.test(zip)) {
    return res.status(400).json({ error: 'Please provide a valid 5-digit ZIP code.' });
  }

  if (mockData.isMockMode()) {
    return res.json(mockData.buildRepresentativeResponse(zip));
  }

  try {
    // 1. Resolve ZIP to state + district
    const { state, district } = await geocode.getDistrictFromZip(zip);
    if (!state) {
      return res.status(404).json({ error: `Could not determine state for ZIP ${zip}` });
    }

    // 2. Query our DB for senators + house rep
    const senatorsResult = await db.query(`
      SELECT p.*,
        COALESCE(
          json_agg(json_build_object(
            'category', bs.category, 'label', bs.label, 'score', bs.score,
            'direction', bs.direction, 'confidence', bs.confidence, 'summary', bs.summary
          )) FILTER (WHERE bs.category IS NOT NULL), '[]'
        ) as bias_scores
      FROM politicians p
      LEFT JOIN bias_scores bs ON bs.politician_id = p.id
      WHERE p.state = $1 AND p.chamber = 'senate' AND p.in_office = true
      GROUP BY p.id
      LIMIT 2
    `, [state]);

    // For house, try to match district; fallback to any rep from state
    let houseResult;
    if (district) {
      houseResult = await db.query(`
        SELECT p.*,
          COALESCE(
            json_agg(json_build_object(
              'category', bs.category, 'label', bs.label, 'score', bs.score,
              'direction', bs.direction, 'confidence', bs.confidence, 'summary', bs.summary
            )) FILTER (WHERE bs.category IS NOT NULL), '[]'
          ) as bias_scores
        FROM politicians p
        LEFT JOIN bias_scores bs ON bs.politician_id = p.id
        WHERE p.state = $1 AND p.chamber = 'house' AND p.district = $2 AND p.in_office = true
        GROUP BY p.id
        LIMIT 1
      `, [state, district]);
    }

    // Fallback if no district match
    if (!houseResult?.rows?.length) {
      houseResult = await db.query(`
        SELECT p.*,
          COALESCE(
            json_agg(json_build_object(
              'category', bs.category, 'label', bs.label, 'score', bs.score,
              'direction', bs.direction, 'confidence', bs.confidence, 'summary', bs.summary
            )) FILTER (WHERE bs.category IS NOT NULL), '[]'
          ) as bias_scores
        FROM politicians p
        LEFT JOIN bias_scores bs ON bs.politician_id = p.id
        WHERE p.state = $1 AND p.chamber = 'house' AND p.in_office = true
        GROUP BY p.id
        LIMIT 1
      `, [state]);
    }

    const allPols = [...senatorsResult.rows, ...(houseResult?.rows || [])];

    if (!allPols.length) {
      return res.status(404).json({
        error: `No representatives found for ZIP ${zip}. Database may need seeding — run scripts/seedMembers.js`,
      });
    }

    const STATE_NAMES = { AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'Washington D.C.' };

    const representatives = allPols.map(p => ({
      name:       p.full_name,
      office:     p.chamber === 'senate'
        ? `${STATE_NAMES[state] || state} — U.S. Senate`
        : `${STATE_NAMES[state] || state}${p.district ? ' District '+p.district : ''} — U.S. House`,
      level:      'federal',
      role:       p.chamber === 'senate' ? 'senator' : 'representative',
      party:      p.party,
      phone:      null,
      url:        p.url,
      photoUrl:   null,
      bioguideId: p.id,
      profile: {
        id:              p.id,
        fullName:        p.full_name,
        party:           p.party,
        state:           p.state,
        chamber:         p.chamber,
        district:        p.district,
        title:           p.title,
        totalVotes:      p.total_votes,
        missedVotesPct:  p.missed_votes_pct,
        partyLoyaltyPct: p.party_loyalty_pct,
        dwNominate:      p.dw_nominate,
        nextElection:    p.next_election,
        twitterHandle:   p.twitter_handle,
        biasScores:      p.bias_scores || [],
        aiAnalysis:      null,
      },
      hasBiasData: (p.bias_scores?.length || 0) > 0,
      hasVoteData: (p.total_votes || 0) > 0,
    }));

    res.json({ state, city: STATE_NAMES[state] || state, zip, representatives, pendingAnalysis: [] });

  } catch (err) {
    console.error('ZIP lookup error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Debug
router.get('/test-zip', async (req, res) => {
  const { zip } = req.query;
  if (!zip) return res.status(400).json({ error: 'Pass ?zip=10001' });
  try {
    const geo = await geocode.getDistrictFromZip(zip);
    const dbCheck = await db.query('SELECT COUNT(*) FROM politicians WHERE state = $1', [geo.state]);
    res.json({ ...geo, politiciansInDB: parseInt(dbCheck.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
