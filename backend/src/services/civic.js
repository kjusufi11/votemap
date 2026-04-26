// src/services/civic.js
// Google Civic Information API — resolves ZIP to representatives
// Docs: https://developers.google.com/civic-information

const axios = require('axios');
const NodeCache = require('node-cache');

const BASE = 'https://www.googleapis.com/civicinfo/v2';
const cache = new NodeCache({ stdTTL: 86400 });

const LEVEL_MAP = {
  country: 'federal',
  administrativeArea1: 'state',
  administrativeArea2: 'county',
  locality: 'local',
};

const ROLE_MAP = {
  legislatorUpperBody: 'senator',
  legislatorLowerBody: 'representative',
  headOfGovernment: 'governor',
  governmentOfficer: 'officer',
};

async function getRepresentativesByZip(zip) {
  const cached = cache.get(zip);
  if (cached) return cached;

  try {
    // Don't pass levels/roles filters — fetch all and filter ourselves
    // Google's API doesn't handle array params well via axios
    const { data } = await axios.get(`${BASE}/representatives`, {
      params: {
        key: process.env.GOOGLE_CIVIC_API_KEY,
        address: zip,
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
    return { state: null, city: null, zip: null, representatives: [] };
  }

  const representatives = [];

  offices.forEach((office) => {
    const level = office.levels?.[0];
    const role  = office.roles?.[0];

    // Only federal and state legislators
    if (level !== 'country' && level !== 'administrativeArea1') return;
    if (role !== 'legislatorUpperBody' && role !== 'legislatorLowerBody') return;

    office.officialIndices?.forEach((idx) => {
      const official = officials[idx];
      if (!official) return;

      representatives.push({
        name:     official.name,
        office:   office.name,
        level:    LEVEL_MAP[level] || level,
        role:     ROLE_MAP[role] || role,
        party:    normalizeParty(official.party),
        phone:    official.phones?.[0] || null,
        url:      official.urls?.[0] || null,
        photoUrl: official.photoUrl || null,
        channels: official.channels || [],
      });
    });
  });

  return {
    state: normalizedInput?.state || null,
    city:  normalizedInput?.city  || null,
    zip:   normalizedInput?.zip   || null,
    representatives,
  };
}

function normalizeParty(party) {
  if (!party) return null;
  const p = party.toLowerCase();
  if (p.includes('democrat'))    return 'D';
  if (p.includes('republican'))  return 'R';
  if (p.includes('independent')) return 'I';
  return party;
}

// Match civic rep name to a bioguide ID using our DB
function matchToBioguide(civicRep, dbMembers) {
  const civicName = normalizeName(civicRep.name);

  for (const member of dbMembers) {
    const memberName = normalizeName(`${member.first_name} ${member.last_name}`);
    if (civicName === memberName) return member.id;

    // Fuzzy: last name + state
    const civicLast  = civicName.split(' ').pop();
    const memberLast = memberName.split(' ').pop();
    if (civicLast === memberLast && member.state === civicRep.state) return member.id;
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

module.exports = { getRepresentativesByZip, matchToBioguide, normalizeName };
