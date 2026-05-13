// src/services/fecClient.js
// Browser-side FEC API client. Called from the browser because api.fec.gov
// may not be reachable from the backend server, but the FEC API supports CORS
// for direct browser requests.

const BASE = 'https://api.fec.gov/v1';
const API_KEY = import.meta.env.VITE_FEC_API_KEY || 'DEMO_KEY';

const STATE_ABBR = {
  alabama:'AL',alaska:'AK',arizona:'AZ',arkansas:'AR',california:'CA',
  colorado:'CO',connecticut:'CT',delaware:'DE',florida:'FL',georgia:'GA',
  hawaii:'HI',idaho:'ID',illinois:'IL',indiana:'IN',iowa:'IA',kansas:'KS',
  kentucky:'KY',louisiana:'LA',maine:'ME',maryland:'MD',massachusetts:'MA',
  michigan:'MI',minnesota:'MN',mississippi:'MS',missouri:'MO',montana:'MT',
  nebraska:'NE',nevada:'NV','new hampshire':'NH','new jersey':'NJ',
  'new mexico':'NM','new york':'NY','north carolina':'NC','north dakota':'ND',
  ohio:'OH',oklahoma:'OK',oregon:'OR',pennsylvania:'PA','rhode island':'RI',
  'south carolina':'SC','south dakota':'SD',tennessee:'TN',texas:'TX',
  utah:'UT',vermont:'VT',virginia:'VA',washington:'WA','west virginia':'WV',
  wisconsin:'WI',wyoming:'WY','district of columbia':'DC',
};

async function get(path, params = {}) {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('api_key', API_KEY);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(String(k), String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`FEC ${res.status}: ${path}`);
  return res.json();
}

// Returns FEC candidate_id or null. Tries last name first (FEC stores as "LAST, FIRST").
// Normalizes full state names to abbreviations. Falls back to the other chamber if no match.
export async function findCandidateId(fullName, state, chamber) {
  const stateAbbr = (state.length === 2 ? state : STATE_ABBR[state.toLowerCase()] || state).toUpperCase();
  const lastName = fullName.trim().split(' ').pop();
  const nameParts = fullName.toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter(p => p.length > 2);

  // Try declared chamber first, then the other one (DB chamber field is sometimes wrong).
  // Three tiers: (1) last name + state + office, (2) full name + state + office,
  // (3) last name + office only (no state) — catches mismatched state abbreviations.
  const primaryOffice = chamber === 'senate' ? 'S' : 'H';
  const fallbackOffice = primaryOffice === 'S' ? 'H' : 'S';

  const attempts = [
    { q: lastName,  state: stateAbbr, office: primaryOffice  },
    { q: fullName,  state: stateAbbr, office: primaryOffice  },
    { q: lastName,  state: stateAbbr, office: fallbackOffice },
    { q: lastName,  state: null,      office: primaryOffice  },
  ];

  for (const { q, state, office } of attempts) {
    try {
      const params = { q, office, per_page: 25 };
      if (state) params.state = state;
      const data = await get('/candidates/search/', params);
      const results = data.results || [];
      if (!results.length) continue;

      const match = results.find(r => {
        const rn = (r.name || '').toLowerCase().replace(/[^a-z ]/g, '');
        return nameParts.some(p => rn.includes(p));
      });

      if (match?.candidate_id) return { candidateId: match.candidate_id, fecName: match.name };
    } catch {}
  }
  return null;
}

// Returns principal campaign committee_id or null.
// Tries principal committee first, then any authorized committee as fallback.
export async function getCommitteeId(candidateId) {
  for (const params of [{ designation: 'P', per_page: 5 }, { per_page: 10 }]) {
    try {
      const data = await get(`/candidate/${candidateId}/committees/`, params);
      const id = data.results?.[0]?.committee_id;
      if (id) return id;
    } catch {}
  }
  return null;
}

// Returns [{employer, total}] aggregated across 2022 + 2024 + 2026 cycles, sorted desc
export async function getTopEmployers(committeeId) {
  const byEmployer = {};
  for (const cycle of [2026, 2024, 2022]) {
    try {
      const data = await get('/schedules/schedule_a/by_employer/', {
        committee_id: committeeId,
        two_year_transaction_period: cycle,
        sort: '-total', per_page: 50,
      });
      for (const r of (data.results || [])) {
        const emp = r.employer?.trim().toUpperCase();
        if (!emp) continue;
        byEmployer[emp] = (byEmployer[emp] || 0) + (r.total || 0);
      }
    } catch {}
  }
  return Object.entries(byEmployer)
    .map(([employer, total]) => ({ employer, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 30);
}
