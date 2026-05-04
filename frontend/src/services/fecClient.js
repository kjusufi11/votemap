// src/services/fecClient.js
// Browser-side FEC API client. Called from the browser because api.fec.gov
// may not be reachable from the backend server, but the FEC API supports CORS
// for direct browser requests.

const BASE = 'https://api.fec.gov/v1';
const API_KEY = import.meta.env.VITE_FEC_API_KEY || 'DEMO_KEY';

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
export async function findCandidateId(fullName, state, chamber) {
  const office = chamber === 'senate' ? 'S' : 'H';
  const lastName = fullName.trim().split(' ').pop();
  const nameParts = fullName.toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter(p => p.length > 2);

  for (const query of [lastName, fullName]) {
    try {
      const data = await get('/candidates/search/', {
        q: query, state: state.toUpperCase(), office,
        sort: '-receipts', per_page: 10,
      });
      const results = data.results || [];
      if (!results.length) continue;

      const match = results.find(r => {
        const rn = (r.name || '').toLowerCase().replace(/[^a-z ]/g, '');
        return nameParts.some(p => rn.includes(p));
      }) || results[0];

      if (match?.candidate_id) return { candidateId: match.candidate_id, fecName: match.name };
    } catch {}
  }
  return null;
}

// Returns principal campaign committee_id or null
export async function getCommitteeId(candidateId) {
  try {
    const data = await get(`/candidate/${candidateId}/committees/`, {
      designation: 'P', per_page: 5,
    });
    return data.results?.[0]?.committee_id || null;
  } catch { return null; }
}

// Returns [{employer, total}] aggregated across 2022 + 2024 cycles, sorted desc
export async function getTopEmployers(committeeId) {
  const byEmployer = {};
  for (const cycle of [2024, 2022]) {
    try {
      const data = await get('/schedules/schedule_a/by_employer/', {
        committee_id: committeeId,
        two_year_transaction_period: cycle,
        sort: '-total', per_page: 25,
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
