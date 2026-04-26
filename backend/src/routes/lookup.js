// src/routes/lookup.js
// POST /api/lookup/zip — core entry point

const express = require('express');
const router  = express.Router();
const civic   = require('../services/civic');
const sync    = require('../services/sync');
const db      = require('../db');
const mockData = require('../services/mockData');

router.post('/zip', async (req, res) => {
  const { zip } = req.body;

  if (!zip || !/^\d{5}$/.test(zip)) {
    return res.status(400).json({ error: 'Please provide a valid 5-digit ZIP code.' });
  }

  // Mock mode
  if (mockData.isMockMode()) {
    console.log(`[MOCK] ZIP lookup: ${zip}`);
    return res.json(mockData.buildRepresentativeResponse(zip));
  }

  try {
    // 1. Get representatives from Google Civic API
    const civicData = await civic.getRepresentativesByZip(zip);

    if (!civicData.representatives.length) {
      return res.status(404).json({ error: `No representatives found for ZIP code ${zip}` });
    }

    // 2. Try to match each rep to our DB by name
    const dbMembers = await db.query(
      `SELECT id, first_name, last_name, state, chamber, party
       FROM politicians WHERE in_office = true`
    );

    const matchedIds = [];
    const repsWithIds = civicData.representatives.map(rep => {
      const bioguideId = civic.matchToBioguide(
        { ...rep, state: civicData.state },
        dbMembers.rows
      );
      if (bioguideId) matchedIds.push(bioguideId);
      return { ...rep, bioguideId };
    });

    // 3. Trigger background sync for reps we haven't seen before
    const district = extractDistrict(civicData.representatives);
    if (civicData.state) {
      sync.syncRepresentatives(civicData.state, district).catch(err =>
        console.warn('Background sync failed:', err.message)
      );
    }

    // 4. Fetch profiles + bias scores for matched IDs
    let profiles = [];
    if (matchedIds.length > 0) {
      const result = await db.query(`
        SELECT p.*,
          COALESCE(
            json_agg(
              json_build_object(
                'category', bs.category, 'label', bs.label,
                'score', bs.score, 'direction', bs.direction,
                'confidence', bs.confidence, 'summary', bs.summary
              )
            ) FILTER (WHERE bs.category IS NOT NULL), '[]'
          ) as bias_scores,
          (SELECT content FROM ai_analysis
           WHERE politician_id = p.id AND analysis_type = 'full_profile'
           LIMIT 1) as ai_analysis
        FROM politicians p
        LEFT JOIN bias_scores bs ON bs.politician_id = p.id
        WHERE p.id = ANY($1)
        GROUP BY p.id
      `, [matchedIds]);
      profiles = result.rows;
    }

    // 5. Build response
    const representatives = repsWithIds.map(rep => {
      const profile = profiles.find(p => p.id === rep.bioguideId);
      return {
        name:       rep.name,
        office:     rep.office,
        level:      rep.level,
        role:       rep.role,
        party:      rep.party,
        phone:      rep.phone,
        url:        rep.url || profile?.url,
        photoUrl:   rep.photoUrl,
        bioguideId: rep.bioguideId,
        profile: profile ? {
          id:               profile.id,
          fullName:         profile.full_name,
          party:            profile.party,
          state:            profile.state,
          chamber:          profile.chamber,
          district:         profile.district,
          title:            profile.title,
          totalVotes:       profile.total_votes,
          missedVotesPct:   profile.missed_votes_pct,
          partyLoyaltyPct:  profile.party_loyalty_pct,
          dwNominate:       profile.dw_nominate,
          nextElection:     profile.next_election,
          twitterHandle:    profile.twitter_handle,
          biasScores:       profile.bias_scores || [],
          aiAnalysis:       profile.ai_analysis || null,
        } : null,
        hasBiasData: (profile?.bias_scores?.length || 0) > 0,
        hasVoteData: (profile?.total_votes || 0) > 0,
      };
    });

    res.json({
      state:           civicData.state,
      city:            civicData.city,
      zip:             civicData.zip || zip,
      representatives,
      pendingAnalysis: matchedIds.filter(id => !profiles.find(p => p.id === id)?.bias_scores?.length),
    });

  } catch (err) {
    console.error('ZIP lookup error:', err.message);
    const status = err.message.includes('No representatives') ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
});

function extractDistrict(reps) {
  for (const rep of reps) {
    if (rep.role === 'representative') {
      const match = rep.office?.match(/(\d+)/);
      if (match) return parseInt(match[1]);
    }
  }
  return null;
}

module.exports = router;

// GET /api/lookup/test-civic?zip=10001 — debug endpoint
router.get('/test-civic', async (req, res) => {
  const { zip } = req.query;
  if (!zip) return res.status(400).json({ error: 'Pass ?zip=10001' });
  try {
    const axios = require('axios');
    const { data } = await axios.get('https://www.googleapis.com/civicinfo/v2/representatives', {
      params: { key: process.env.GOOGLE_CIVIC_API_KEY, address: zip },
    });
    res.json({
      normalizedInput: data.normalizedInput,
      officeCount: data.offices?.length,
      officialCount: data.officials?.length,
      offices: data.offices?.map(o => ({ name: o.name, levels: o.levels, roles: o.roles })),
    });
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});
