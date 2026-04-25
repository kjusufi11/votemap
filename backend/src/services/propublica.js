// src/services/propublica.js
// Thin wrapper around the ProPublica Congress API
// Docs: https://projects.propublica.org/api-docs/congress-api/

const axios = require('axios');
const NodeCache = require('node-cache');

const BASE = 'https://api.propublica.org/congress/v1';
const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL_VOTES || 3600) });

const client = axios.create({
  baseURL: BASE,
  headers: { 'X-API-Key': process.env.PROPUBLICA_API_KEY },
});

async function get(path, ttl = null) {
  const key = path;
  const cached = cache.get(key);
  if (cached) return cached;

  try {
    const { data } = await client.get(path);
    const result = data.results;
    cache.set(key, result, ttl || cache.options.stdTTL);
    return result;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(`ProPublica API error [${path}]: ${msg}`);
  }
}

// ── Members ──────────────────────────────────────────────────────────────────

// Get all current members of a chamber
// chamber: "senate" or "house"
async function getMembers(congress, chamber) {
  const ttl = parseInt(process.env.CACHE_TTL_MEMBERS || 86400);
  return get(`/${congress}/${chamber}/members.json`, ttl);
}

// Get a single member's full profile
async function getMember(bioguideId) {
  const ttl = parseInt(process.env.CACHE_TTL_MEMBERS || 86400);
  const results = await get(`/members/${bioguideId}.json`, ttl);
  return results[0];
}

// Get members for a specific state (senators only)
async function getSenatorsByState(state) {
  const ttl = parseInt(process.env.CACHE_TTL_MEMBERS || 86400);
  return get(`/members/senate/${state}/current.json`, ttl);
}

// Get House members for a specific state + district
async function getRepByDistrict(state, district) {
  const ttl = parseInt(process.env.CACHE_TTL_MEMBERS || 86400);
  return get(`/members/house/${state}/${district}/current.json`, ttl);
}

// ── Votes ────────────────────────────────────────────────────────────────────

// Get recent votes by a specific member
// offset: pagination (0, 20, 40, ...)
async function getMemberVotes(bioguideId, offset = 0) {
  return get(`/members/${bioguideId}/votes.json?offset=${offset}`);
}

// Compare votes between two members
async function compareVotes(memberId1, memberId2, congress, chamber) {
  return get(`/members/${memberId1}/votes/${memberId2}/${congress}/${chamber}.json`);
}

// Get a specific roll call vote
async function getRollCallVote(congress, chamber, session, rollCallNumber) {
  const c = chamber === 'house' ? 'house' : 'senate';
  return get(`/${congress}/${c}/sessions/${session}/votes/${rollCallNumber}.json`);
}

// Get recent votes for the whole chamber
async function getRecentVotes(chamber, offset = 0) {
  return get(`/${chamber}/votes/recent.json?offset=${offset}`);
}

// ── Bills ────────────────────────────────────────────────────────────────────

// Get bills sponsored by a member
async function getMemberBills(bioguideId, type = 'introduced') {
  // type: introduced, updated, passed, enacted, vetoed
  return get(`/members/${bioguideId}/bills/${type}.json`);
}

// Get bill details
async function getBill(congress, billId) {
  return get(`/${congress}/bills/${billId}.json`);
}

// ── Normalize ─────────────────────────────────────────────────────────────────
// Convert ProPublica member object → our DB schema

function normalizeMember(m, chamber) {
  return {
    id: m.id,
    full_name: `${m.first_name} ${m.last_name}`,
    first_name: m.first_name,
    last_name: m.last_name,
    party: m.party,
    state: m.state,
    chamber,
    district: m.district ? parseInt(m.district) : null,
    title: chamber === 'senate' ? 'Sen.' : 'Rep.',
    in_office: m.in_office !== false,
    dw_nominate: m.dw_nominate || null,
    next_election: m.next_election || null,
    twitter_handle: m.twitter_account || null,
    url: m.url || null,
    total_votes: m.total_votes || 0,
    missed_votes_pct: parseFloat(m.missed_votes_pct) || 0,
    party_loyalty_pct: parseFloat(m.votes_with_party_pct) || 0,
  };
}

function normalizeVote(v, politicianId) {
  return {
    politician_id: politicianId,
    vote_id: v.vote_id || `${v.roll_call}-${v.congress}-${v.session}`,
    position: v.position,
    question: v.question,
    description: v.description,
    vote_date: v.date,
    session: String(v.session),
    congress: v.congress,
  };
}

module.exports = {
  getMembers,
  getMember,
  getSenatorsByState,
  getRepByDistrict,
  getMemberVotes,
  compareVotes,
  getRollCallVote,
  getRecentVotes,
  getMemberBills,
  getBill,
  normalizeMember,
  normalizeVote,
};
