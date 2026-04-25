// src/services/biasEngine.js
// Uses Claude to analyze a politician's voting record and surface ideological patterns.
// Results are cached in the bias_scores table to avoid re-running expensive analysis.

const Anthropic = require('@anthropic-ai/sdk');
const db = require('../db');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Category taxonomy ─────────────────────────────────────────────────────────
// These are the categories we track. Bills get tagged with these when synced.
// The AI uses these as a framework but can also identify patterns outside them.

const CATEGORIES = [
  { id: 'reproductive_rights', label: 'Reproductive rights' },
  { id: 'gun_control', label: 'Gun control' },
  { id: 'climate_environment', label: 'Climate & environment' },
  { id: 'immigration', label: 'Immigration' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'foreign_policy', label: 'Foreign policy' },
  { id: 'defense_spending', label: 'Defense spending' },
  { id: 'taxation_fiscal', label: 'Taxation & fiscal policy' },
  { id: 'criminal_justice', label: 'Criminal justice' },
  { id: 'voting_rights', label: 'Voting rights & elections' },
  { id: 'labor_unions', label: 'Labor & unions' },
  { id: 'financial_regulation', label: 'Financial regulation' },
  { id: 'drug_policy', label: 'Drug policy' },
  { id: 'education', label: 'Education' },
  { id: 'social_safety_net', label: 'Social safety net' },
  { id: 'foreign_lobbying', label: 'Foreign lobbying & influence' },
  { id: 'lgbtq_rights', label: 'LGBTQ+ rights' },
  { id: 'tech_privacy', label: 'Tech & privacy' },
];

// ── Main analysis function ─────────────────────────────────────────────────────

async function analyzePolitician(politicianId, forceRefresh = false) {
  // Check cache first (skip if forceRefresh)
  if (!forceRefresh) {
    const cached = await getCachedAnalysis(politicianId);
    if (cached) return cached;
  }

  // Pull their voting record from DB
  const { politician, votes } = await getPoliticianVoteData(politicianId);
  if (!politician) throw new Error(`Politician ${politicianId} not found`);
  if (votes.length < 10) {
    return { biases: [], summary: 'Not enough votes to analyze patterns yet.', voteCount: votes.length };
  }

  // Format votes for Claude
  const voteText = formatVotesForPrompt(votes);

  // Run analysis
  const analysis = await runClaudeAnalysis(politician, voteText, votes.length);

  // Persist to DB
  await saveAnalysis(politicianId, analysis);

  return analysis;
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getPoliticianVoteData(politicianId) {
  const [polResult, votesResult] = await Promise.all([
    db.query('SELECT * FROM politicians WHERE id = $1', [politicianId]),
    db.query(`
      SELECT v.position, v.question, v.description, v.vote_date, v.congress,
             b.title, b.short_title, b.primary_subject, b.categories
      FROM votes v
      LEFT JOIN bills b ON v.bill_id = b.id
      WHERE v.politician_id = $1
      ORDER BY v.vote_date DESC
      LIMIT 200
    `, [politicianId]),
  ]);

  return {
    politician: polResult.rows[0] || null,
    votes: votesResult.rows,
  };
}

async function getCachedAnalysis(politicianId) {
  // Return cached if computed within the last 24 hours
  const result = await db.query(`
    SELECT content, computed_at FROM ai_analysis
    WHERE politician_id = $1 AND analysis_type = 'full_profile'
    AND computed_at > NOW() - INTERVAL '24 hours'
  `, [politicianId]);

  return result.rows[0]?.content || null;
}

// ── Prompt construction ───────────────────────────────────────────────────────

function formatVotesForPrompt(votes) {
  return votes.map(v => {
    const bill = v.short_title || v.title || v.description || v.question || 'Unknown bill';
    const subject = v.primary_subject || (v.categories?.join(', ')) || '';
    return `- ${v.position.toUpperCase()}: ${bill}${subject ? ` [${subject}]` : ''} (${v.vote_date?.toISOString?.()?.slice(0, 7) || 'unknown'})`;
  }).join('\n');
}

async function runClaudeAnalysis(politician, voteText, totalVotes) {
  const categoriesList = CATEGORIES.map(c => `${c.id}: ${c.label}`).join('\n');

  const prompt = `You are a nonpartisan political analyst. Analyze the voting record of the following elected official and identify their ideological patterns and biases based purely on how they vote — not party affiliation.

POLITICIAN:
Name: ${politician.full_name}
Party: ${politician.party === 'D' ? 'Democrat' : politician.party === 'R' ? 'Republican' : politician.party}
State: ${politician.state}
Chamber: ${politician.chamber}
Party loyalty score: ${politician.party_loyalty_pct}%
Total votes analyzed: ${totalVotes}

RECENT VOTES (position: bill title [subject]):
${voteText}

CATEGORIES TO CONSIDER:
${categoriesList}

TASK:
1. Identify the top 4-8 strongest voting patterns (biases) this politician demonstrates.
2. For each bias, score it 0.0–1.0 (1.0 = votes this way 100% of the time), note direction ("for" or "against" the category issue), and write a 1-sentence factual description.
3. Write a 2-3 sentence neutral summary of this politician's overall ideological profile based on their votes.
4. Flag any anomalies — places where they break significantly from their party or expected ideology.

Respond ONLY with valid JSON, no preamble, no markdown, no code fences. Exactly this structure:
{
  "biases": [
    {
      "category": "reproductive_rights",
      "label": "Anti-abortion rights",
      "score": 0.97,
      "direction": "against",
      "confidence": "high",
      "vote_count": 12,
      "summary": "Has voted against reproductive rights legislation in 12 of 12 recorded votes."
    }
  ],
  "overall_summary": "...",
  "anomalies": ["..."],
  "dominant_ideology": "conservative|liberal|moderate|libertarian|populist|other"
}`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();

  try {
    const parsed = JSON.parse(text);
    return {
      ...parsed,
      voteCount: totalVotes,
      computedAt: new Date().toISOString(),
    };
  } catch {
    throw new Error(`Claude returned invalid JSON: ${text.slice(0, 200)}`);
  }
}

// ── Persistence ───────────────────────────────────────────────────────────────

async function saveAnalysis(politicianId, analysis) {
  // Save full analysis blob
  await db.query(`
    INSERT INTO ai_analysis (politician_id, analysis_type, content, model_version)
    VALUES ($1, 'full_profile', $2, 'claude-opus-4-5')
    ON CONFLICT (politician_id, analysis_type)
    DO UPDATE SET content = $2, model_version = 'claude-opus-4-5', computed_at = NOW()
  `, [politicianId, JSON.stringify(analysis)]);

  // Also save individual bias scores for querying
  if (analysis.biases?.length) {
    for (const bias of analysis.biases) {
      await db.query(`
        INSERT INTO bias_scores
          (politician_id, category, label, score, direction, vote_count, confidence, summary)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (politician_id, category)
        DO UPDATE SET
          label = $3, score = $4, direction = $5,
          vote_count = $6, confidence = $7, summary = $8,
          computed_at = NOW()
      `, [
        politicianId,
        bias.category,
        bias.label,
        bias.score,
        bias.direction,
        bias.vote_count || null,
        bias.confidence || 'medium',
        bias.summary,
      ]);
    }
  }
}

// ── Batch analysis ────────────────────────────────────────────────────────────
// Run bias analysis for a list of politicians (e.g. a user's representatives)

async function analyzeMultiple(politicianIds) {
  const results = {};
  // Run sequentially to respect API rate limits
  for (const id of politicianIds) {
    try {
      results[id] = await analyzePolitician(id);
    } catch (err) {
      console.error(`Bias analysis failed for ${id}:`, err.message);
      results[id] = { error: err.message };
    }
  }
  return results;
}

// ── Bill categorization ───────────────────────────────────────────────────────
// Tag a batch of bills with our category taxonomy

async function categorizeBills(bills) {
  if (!bills.length) return [];

  const billList = bills.map((b, i) =>
    `${i}: "${b.short_title || b.title}" [ProPublica subject: ${b.primary_subject || 'none'}]`
  ).join('\n');

  const categoriesList = CATEGORIES.map(c => c.id).join(', ');

  const prompt = `Tag each bill with the most relevant categories from this list: ${categoriesList}

Bills:
${billList}

Respond ONLY with a JSON array where each element is an array of category IDs for that bill (same order as input). Use [] if none apply. No preamble, no markdown.
Example: [["reproductive_rights","healthcare"],["gun_control"],[]]`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001', // Use faster/cheaper model for bulk tagging
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    return JSON.parse(response.content[0].text.trim());
  } catch {
    return bills.map(() => []);
  }
}

module.exports = {
  analyzePolitician,
  analyzeMultiple,
  categorizeBills,
  CATEGORIES,
};
