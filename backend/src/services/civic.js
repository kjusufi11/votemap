// src/services/civic.js
// Google Civic Information API
// Resolves a ZIP code to the user's actual elected representatives at all levels
// Docs: https://developers.google.com/civic-information

const axios = require('axios');
const NodeCache = require('node-cache');

const BASE = 'https://www.googleapis.com/civicinfo/v2';
const cache = new NodeCache({ stdTTL: 86400 }); // ZIP lookups are stable, cache 24hr

// Map Google's office levels/roles to our categories
const LEVEL_MAP = {
  country: 'federal',
  administrativeArea1: 'state',
  administrativeArea2: 'county',
  locality: 'local',
};

const ROLE_MAP = {
  legislatorUpperBody: 'senator',
  legislatorLowerBody: 'representative',
  governmentOfficer: 'officer',
  headOfGovernment: 'governor',
  deputyHeadOfGovernment: 'lt_governor',
};

async function getRepresentativesByZip(zip) {
  const cached = cache.get(zip);
  if (cached) return cached;

  try {
    const { data } = await axios.get(`${BASE}/representatives`, {
      params: {
        key: process.env.GOOGLE_CIVIC_API_KEY,
        address: zip,
        // We want all levels so users can see local officials too
        levels: ['country', 'administrativeArea1'],
        roles: ['legislatorUpperBody', 'legislatorLowerBody'],
      },
    });

    const result = parseResponse(data);
    cache.set(zip, result);
    return result;
  } catch (err) {
    if (err.response?.status === 404) {
      throw new Error(`No representatives found for ZIP code ${zip}`);
    }
    const msg = err.response?.data?.error?.message || err.message;
    throw new Error(`Civic API error: ${msg}`);
  }
}

function parseResponse(data) {
  const { normalizedInput, offices, officials } = data;

  if (!offices || !officials) {
    return { state: null, district: null, representatives: [] };
  }

  const representatives = [];

  offices.forEach((office) => {
    const level = office.levels?.[0];
    const role = office.roles?.[0];

    // Only include federal and state legislators for now
    if (level !== 'country' && level !== 'administrativeArea1') return;

    office.officialIndices?.forEach((idx) => {
      const official = officials[idx];
      if (!official) return;

      representatives.push({
        name: official.name,
        office: office.name,
        level: LEVEL_MAP[level] || level,
        role: ROLE_MAP[role] || role,
        party: normalizeParty(official.party),
        phone: official.phones?.[0] || null,
        url: official.urls?.[0] || null,
        photoUrl: official.photoUrl || null,
        // These won't always be present — we'll match to ProPublica IDs separately
        channels: official.channels || [],
      });
    });
  });

  return {
    state: normalizedInput?.state || null,
    city: normalizedInput?.city || null,
    zip: normalizedInput?.zip || null,
    representatives,
  };
}

function normalizeParty(party) {
  if (!party) return null;
  const p = party.toLowerCase();
  if (p.includes('democrat')) return 'D';
  if (p.includes('republican')) return 'R';
  if (p.includes('independent')) return 'I';
  return party;
}

// Match a Civic API representative to a ProPublica bioguide ID
// by comparing normalized names + state + chamber
function matchToBioguide(civicRep, propublicaMembers) {
  const civicName = normalizeName(civicRep.name);

  for (const member of propublicaMembers) {
    const memberName = normalizeName(`${member.first_name} ${member.last_name}`);
    if (civicName === memberName) return member.id;

    // Fuzzy: last name match + state match (handles middle names, suffixes)
    const civicLast = civicName.split(' ').pop();
    const memberLast = memberName.split(' ').pop();
    if (civicLast === memberLast && member.state === civicRep.state) {
      return member.id;
    }
  }
  return null;
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv|dr|mr|mrs|ms)\b\.?/g, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  getRepresentativesByZip,
  matchToBioguide,
  normalizeName,
};
