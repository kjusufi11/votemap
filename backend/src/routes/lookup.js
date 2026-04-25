// src/routes/lookup.js
// POST /api/lookup/zip  — core entry point for the app
// Takes a ZIP code, returns the user's representatives with their bias profiles

const express = require('express');
const router = express.Router();
const civic = require('../services/civic');
const sync = require('../services/sync');
const biasEngine = require('../services/biasEngine');
const db = require('../db');
const mockData = require('../services/mockData');

// POST /api/lookup/zip
// Body: { zip: "10001" }
// Returns: { state, city, representatives: [...] }
router.post('/zip', async (req, res) => {
  const { zip } = req.body;

  if (!zip || !/^\d{5}$/.test(zip)) {
    return res.status(400).json({ error: 'Please provide a valid 5-digit ZIP code.' });
  }

  try {
    // ── Mock mode (no API keys configured) ───────────────────────────────────
    if (mockData.isMockMode()) {
      console.log(`[MOCK] ZIP lookup: ${zip}`);
      return res.json(mockData.buildRepresentativeResponse(zip));
    }

    // 1. Look up representatives via Google Civic API
    const civicData = await civic.getRepresentativesByZip(zip);

    // 2. Try to match each rep to our DB (by name + state)
    // First ensure we have current members in DB
    const dbMembers = await db.query(
      'SELECT id, full_name, first_name, last_name, state, chamber, party FROM politicians WHERE in_office = true',
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

    // 3. If we have any matches, trigger background sync for their votes
    // (don't await — let it happen async so response is fast)
    if (civicData.state) {
      const district = extractDistrict(civicData.representatives);
      sync.syncRepresentatives(civicData.state, district).catch(err =>
        console.warn('Background sync failed:', err.message)
      );
    }

    // 4. Fetch full politician profiles + cached bias scores for matched IDs
    let profiles = [];
    if (matchedIds.length > 0) {
      const profileResult = await db.query(`
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
                'summary', bs.summary
              )
            ) FILTER (WHERE bs.category IS NOT NULL),
            '[]'
          ) as bias_scores,
          (SELECT content FROM ai_analysis WHERE politician_id = p.id AND analysis_type = 'full_profile' LIMIT 1) as ai_analysis
        FROM politicians p
        LEFT JOIN bias_scores bs ON bs.politician_id = p.id
        WHERE p.id = ANY($1)
        GROUP BY p.id
      `, [matchedIds]);
      profiles = profileResult.rows;
    }

    // 5. Build response, merging Civic names with DB profiles
    const representatives = repsWithIds.map(rep => {
      const profile = profiles.find(p => p.id === rep.bioguideId);
      return {
        // Civic data (always available)
        name: rep.name,
        office: rep.office,
        level: rep.level,
        role: rep.role,
        party: rep.party,
        phone: rep.phone,
        url: rep.url || profile?.url,
        photoUrl: rep.photoUrl || profile?.photo_url,
        // DB profile (available after sync)
        bioguideId: rep.bioguideId,
        profile: profile ? sanitizeProfile(profile) : null,
        // Flag whether we have deep data yet
        hasBiasData: (profile?.bias_scores?.length || 0) > 0,
        hasVoteData: (profile?.total_votes || 0) > 0,
      };
    });

    res.json({
      state: civicData.state,
      city: civicData.city,
      zip: civicData.zip || zip,
      representatives,
      // Tell frontend whether bias analysis needs to be triggered
      pendingAnalysis: matchedIds.filter(id =>
        !profiles.find(p => p.id === id)?.bias_scores?.length
      ),
    });

  } catch (err) {
    console.error('ZIP lookup error:', err);
    res.status(err.message.includes('No representatives') ? 404 : 500).json({
      error: err.message || 'Failed to look up representatives.',
    });
  }
});

// Helper: extract likely House district number from Civic rep offices
function extractDistrict(representatives) {
  for (const rep of representatives) {
    if (rep.role === 'representative') {
      const match = rep.office?.match(/(\d+)/);
      if (match) return parseInt(match[1]);
    }
  }
  return null;
}

function sanitizeProfile(profile) {
  return {
    id: profile.id,
    fullName: profile.full_name,
    party: profile.party,
    state: profile.state,
    chamber: profile.chamber,
    district: profile.district,
    title: profile.title,
    totalVotes: profile.total_votes,
    missedVotesPct: profile.missed_votes_pct,
    partyLoyaltyPct: profile.party_loyalty_pct,
    dwNominate: profile.dw_nominate,
    nextElection: profile.next_election,
    twitterHandle: profile.twitter_handle,
    biasScores: profile.bias_scores || [],
    aiAnalysis: profile.ai_analysis || null,
  };
}

module.exports = router;
