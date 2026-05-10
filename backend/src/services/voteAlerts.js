// src/services/voteAlerts.js
// Event-triggered email alerts:
//   1. Post-vote alert  — sent after nightly sync finds new votes matching user priorities
//   2. Upcoming alert   — sent when new legislation appears on a user's priority topics

const db = require('../db');
const congress = require('./congress');
const { classifyVote, getAllDomains } = require('./domainClassifier');
const { sendVoteAlert, sendUpcomingAlert } = require('./emailService');

// Maps user survey importance keys → domainClassifier keys
const ISSUE_TO_DOMAIN = {
  healthcare: 'healthcare',
  climate: 'climate',
  immigration: 'immigration',
  gun_policy: 'gun_policy',
  taxes: 'economy',
  defense: 'defense',
  reproductive_rights: 'reproductive_rights',
  education: 'education',
  safety_net: 'safety_net',
  criminal_justice: 'criminal_justice',
};

// Maps domain keys → primary_subject values for upcoming bill matching
const DOMAIN_TO_SUBJECTS = {
  healthcare: ['Health', 'Medicare', 'Medicaid', 'Opioid Abuse'],
  climate: ['Environmental Protection', 'Energy', 'Public Lands and Natural Resources'],
  immigration: ['Immigration', 'Border Security'],
  gun_policy: ['Crime and Law Enforcement', 'Firearms'],
  economy: ['Taxation', 'Economics and Public Finance', 'Labor and Employment'],
  defense: ['Armed Forces and National Security', 'International Affairs'],
  reproductive_rights: ['Civil Rights and Liberties, Minority Issues', 'Health'],
  education: ['Education'],
  safety_net: ['Social Welfare', 'Housing and Community Development'],
  criminal_justice: ['Crime and Law Enforcement', 'Law'],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildUnsubscribeUrl(token) {
  return `https://votematch.app/unsubscribe?token=${token}`;
}

async function getOptedInUsers() {
  const { rows } = await db.query(`
    SELECT u.id, u.email, np.unsubscribe_token, s.importance
    FROM users u
    JOIN user_notification_prefs np ON np.user_id = u.id::text
    JOIN user_surveys s ON s.user_id = u.id::text
    WHERE np.vote_alerts = true
    AND s.importance IS NOT NULL
  `);
  return rows;
}

function getUserPriorityDomains(user) {
  return new Set(
    Object.entries(user.importance || {})
      .filter(([, v]) => v >= 2)
      .map(([k]) => ISSUE_TO_DOMAIN[k])
      .filter(Boolean)
  );
}

// ── Post-vote alerts ──────────────────────────────────────────────────────────

async function runPostVoteAlerts() {
  const domains = getAllDomains();

  // New votes inserted in the last 25 hours (slight overlap buffer)
  const { rows: recentVotes } = await db.query(`
    SELECT v.id, v.politician_id, v.position, v.question, v.description, v.vote_date,
           b.title, b.short_title, b.primary_subject, b.categories,
           p.full_name, p.state, p.chamber, p.title AS pol_title
    FROM votes v
    LEFT JOIN bills b ON v.bill_id = b.id
    JOIN politicians p ON v.politician_id = p.id
    WHERE v.created_at > NOW() - INTERVAL '25 hours'
    AND v.position IN ('Yes', 'No')
    ORDER BY v.created_at DESC
  `);

  if (!recentVotes.length) return 0;

  const classifiedVotes = recentVotes
    .map(v => ({ ...v, domain: classifyVote(v) }))
    .filter(v => v.domain);

  if (!classifiedVotes.length) return 0;

  const users = await getOptedInUsers();
  let sent = 0;

  for (const user of users) {
    const priorityDomains = getUserPriorityDomains(user);
    if (!priorityDomains.size) continue;

    for (const vote of classifiedVotes) {
      if (!priorityDomains.has(vote.domain)) continue;

      const { rows: already } = await db.query(
        'SELECT 1 FROM email_notifications_sent WHERE user_id = $1 AND vote_id = $2',
        [String(user.id), vote.id]
      );
      if (already.length) continue;

      const domainLabel = domains[vote.domain]?.label || vote.domain;

      try {
        await sendVoteAlert(user.email, {
          politician: {
            id: vote.politician_id,
            title: vote.pol_title || '',
            full_name: vote.full_name,
          },
          vote: {
            position: vote.position,
            description: vote.description || vote.title,
            question: vote.question,
            vote_date: vote.vote_date,
          },
          domainLabel,
          unsubscribeUrl: buildUnsubscribeUrl(user.unsubscribe_token),
        });

        await db.query(
          'INSERT INTO email_notifications_sent (user_id, vote_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [String(user.id), vote.id]
        );
        sent++;
      } catch (err) {
        console.error(`[alerts] send failed to ${user.email}:`, err.message);
      }

      await new Promise(r => setTimeout(r, 50));
    }
  }

  return sent;
}

// ── Upcoming-legislation alerts ───────────────────────────────────────────────
// Sends when Congress.gov shows a new bill updated in the last 3 days that
// matches a user's priority issue area. Uses a separate dedup key ("bill-<id>").

const CALENDAR_KEYWORDS = [
  'placed on', 'scheduled', 'calendar', 'floor consideration',
  'agreed to', 'passed', 'advanced', 'cloture',
];

function isBillActionUpcoming(action = '') {
  const a = action.toLowerCase();
  return CALENDAR_KEYWORDS.some(k => a.includes(k));
}

function billMatchesDomain(bill, domainKey) {
  const subjects = DOMAIN_TO_SUBJECTS[domainKey] || [];
  const policyArea = (bill.policyArea?.name || '').toLowerCase();
  const title = (bill.title || '').toLowerCase();
  const keywords = require('./domainClassifier').getAllDomains()[domainKey]?.keywords || [];

  if (subjects.some(s => policyArea.includes(s.toLowerCase()))) return true;
  if (keywords.some(k => title.includes(k.toLowerCase()))) return true;
  return false;
}

async function runUpcomingAlerts() {
  const domains = getAllDomains();
  let bills;
  try {
    bills = await congress.getRecentBills(congress.CURRENT_CONGRESS, 4);
  } catch (err) {
    console.warn('[alerts] Could not fetch recent bills:', err.message);
    return 0;
  }

  // Only bills with an action suggesting floor activity
  const actionableBills = bills.filter(b => isBillActionUpcoming(b.latestAction?.text));
  if (!actionableBills.length) return 0;

  const users = await getOptedInUsers();
  let sent = 0;

  for (const user of users) {
    const priorityDomains = getUserPriorityDomains(user);
    if (!priorityDomains.size) continue;

    for (const bill of actionableBills) {
      const matchedDomain = [...priorityDomains].find(d => billMatchesDomain(bill, d));
      if (!matchedDomain) continue;

      const { rows: billAlready } = await db.query(
        'SELECT 1 FROM email_notifications_sent WHERE user_id = $1 AND vote_id = $2',
        [String(user.id), billDedupId(bill)]
      );
      if (billAlready.length) continue;

      const domainLabel = domains[matchedDomain]?.label || matchedDomain;
      const chamber = (bill.originChamber || '').toLowerCase().includes('senate') ? 'senate' : 'house';

      try {
        await sendUpcomingAlert(user.email, {
          bill: {
            number: bill.number,
            title: bill.title || 'Untitled bill',
            latestAction: bill.latestAction?.text,
          },
          domainLabel,
          chamber,
          unsubscribeUrl: buildUnsubscribeUrl(user.unsubscribe_token),
        });

        await db.query(
          'INSERT INTO email_notifications_sent (user_id, vote_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [String(user.id), billDedupId(bill)]
        );
        sent++;
      } catch (err) {
        console.error(`[alerts] upcoming send failed to ${user.email}:`, err.message);
      }

      await new Promise(r => setTimeout(r, 50));
    }
  }

  return sent;
}

// Stable negative integer ID for bill dedup (avoids collision with real vote IDs)
// Uses a simple hash: take last 8 digits of bill number as negative int
function billDedupId(bill) {
  const str = String(bill.number || bill.url || bill.title || Math.random());
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return -(Math.abs(h) % 2000000000 || 1); // negative, never 0
}

// ── Main export ────────────────────────────────────────────────────────────────

async function runVoteAlerts() {
  console.log('[alerts] Running post-vote alerts...');
  const v = await runPostVoteAlerts();
  console.log(`[alerts] ✓ Sent ${v} post-vote alerts`);

  console.log('[alerts] Running upcoming-legislation alerts...');
  const u = await runUpcomingAlerts();
  console.log(`[alerts] ✓ Sent ${u} upcoming alerts`);

  return { postVote: v, upcoming: u };
}

module.exports = { runVoteAlerts };
