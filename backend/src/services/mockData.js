// src/services/mockData.js
// Realistic mock data for development/demo mode.
// Activated when PROPUBLICA_API_KEY or GOOGLE_CIVIC_API_KEY is missing.
// Covers a representative spread of ZIP codes, states, chambers, parties.

const MOCK_POLITICIANS = {
  'S000033': {
    id: 'S000033', full_name: 'Bernie Sanders', first_name: 'Bernie', last_name: 'Sanders',
    party: 'I', state: 'VT', chamber: 'senate', district: null, title: 'Sen.',
    in_office: true, dw_nominate: -0.79, next_election: '2024',
    twitter_handle: 'SenSanders', url: 'https://www.sanders.senate.gov',
    total_votes: 2841, missed_votes_pct: 4.2, party_loyalty_pct: 86.3,
  },
  'W000779': {
    id: 'W000779', full_name: 'Ron Wyden', first_name: 'Ron', last_name: 'Wyden',
    party: 'D', state: 'OR', chamber: 'senate', district: null, title: 'Sen.',
    in_office: true, dw_nominate: -0.44, next_election: '2026',
    twitter_handle: 'RonWyden', url: 'https://www.wyden.senate.gov',
    total_votes: 3104, missed_votes_pct: 2.1, party_loyalty_pct: 93.7,
  },
  'C000880': {
    id: 'C000880', full_name: 'Mike Crapo', first_name: 'Mike', last_name: 'Crapo',
    party: 'R', state: 'ID', chamber: 'senate', district: null, title: 'Sen.',
    in_office: true, dw_nominate: 0.61, next_election: '2026',
    twitter_handle: 'MikeCrapo', url: 'https://www.crapo.senate.gov',
    total_votes: 2988, missed_votes_pct: 3.8, party_loyalty_pct: 91.2,
  },
  'O000172': {
    id: 'O000172', full_name: 'Alexandria Ocasio-Cortez', first_name: 'Alexandria', last_name: 'Ocasio-Cortez',
    party: 'D', state: 'NY', chamber: 'house', district: 14, title: 'Rep.',
    in_office: true, dw_nominate: -0.88, next_election: '2024',
    twitter_handle: 'AOC', url: 'https://ocasio-cortez.house.gov',
    total_votes: 1876, missed_votes_pct: 5.1, party_loyalty_pct: 97.2,
  },
  'G000596': {
    id: 'G000596', full_name: 'Marjorie Taylor Greene', first_name: 'Marjorie', last_name: 'Taylor Greene',
    party: 'R', state: 'GA', chamber: 'house', district: 14, title: 'Rep.',
    in_office: true, dw_nominate: 0.91, next_election: '2024',
    twitter_handle: 'RepMTG', url: 'https://greene.house.gov',
    total_votes: 1654, missed_votes_pct: 8.3, party_loyalty_pct: 78.4,
  },
  'P000197': {
    id: 'P000197', full_name: 'Nancy Pelosi', first_name: 'Nancy', last_name: 'Pelosi',
    party: 'D', state: 'CA', chamber: 'house', district: 11, title: 'Rep.',
    in_office: true, dw_nominate: -0.51, next_election: '2024',
    twitter_handle: 'SpeakerPelosi', url: 'https://pelosi.house.gov',
    total_votes: 4211, missed_votes_pct: 1.9, party_loyalty_pct: 98.1,
  },
  'C001098': {
    id: 'C001098', full_name: 'Ted Cruz', first_name: 'Ted', last_name: 'Cruz',
    party: 'R', state: 'TX', chamber: 'senate', district: null, title: 'Sen.',
    in_office: true, dw_nominate: 0.82, next_election: '2024',
    twitter_handle: 'SenTedCruz', url: 'https://www.cruz.senate.gov',
    total_votes: 2203, missed_votes_pct: 14.1, party_loyalty_pct: 88.6,
  },
  'W000817': {
    id: 'W000817', full_name: 'Elizabeth Warren', first_name: 'Elizabeth', last_name: 'Warren',
    party: 'D', state: 'MA', chamber: 'senate', district: null, title: 'Sen.',
    in_office: true, dw_nominate: -0.71, next_election: '2024',
    twitter_handle: 'SenWarren', url: 'https://www.warren.senate.gov',
    total_votes: 2654, missed_votes_pct: 3.3, party_loyalty_pct: 95.8,
  },
};

const MOCK_BIAS_SCORES = {
  'S000033': [
    { category: 'social_safety_net', label: 'Pro-social safety net', score: 0.99, direction: 'for', confidence: 'high', vote_count: 47, summary: 'Has championed social safety net legislation in virtually every vote, a defining feature of his tenure.' },
    { category: 'healthcare', label: 'Pro-universal healthcare', score: 0.98, direction: 'for', confidence: 'high', vote_count: 38, summary: 'Consistent advocate for Medicare-for-All and expanded public health coverage.' },
    { category: 'financial_regulation', label: 'Pro-financial regulation', score: 0.94, direction: 'for', confidence: 'high', vote_count: 31, summary: 'Consistently votes for stricter oversight of Wall Street and financial institutions.' },
    { category: 'climate_environment', label: 'Pro-climate legislation', score: 0.92, direction: 'for', confidence: 'high', vote_count: 29, summary: 'Strong supporter of climate action and Green New Deal-adjacent legislation.' },
    { category: 'defense_spending', label: 'Anti-defense spending increases', score: 0.78, direction: 'against', confidence: 'medium', vote_count: 22, summary: 'Frequently votes against defense budget expansions, preferring domestic investment.' },
    { category: 'foreign_policy', label: 'Anti-military intervention', score: 0.81, direction: 'against', confidence: 'high', vote_count: 18, summary: 'Opposed most military interventions and arms sales throughout his career.' },
  ],
  'C001098': [
    { category: 'reproductive_rights', label: 'Anti-abortion rights', score: 0.97, direction: 'against', confidence: 'high', vote_count: 24, summary: 'Has voted against reproductive rights legislation in every recorded instance.' },
    { category: 'gun_control', label: 'Anti-gun control', score: 0.95, direction: 'against', confidence: 'high', vote_count: 19, summary: 'Opposes all gun control measures; has an A+ rating from the NRA.' },
    { category: 'climate_environment', label: 'Anti-climate legislation', score: 0.93, direction: 'against', confidence: 'high', vote_count: 28, summary: 'Consistently votes against climate regulation, has called climate change "not settled science."' },
    { category: 'immigration', label: 'Anti-immigration reform', score: 0.91, direction: 'against', confidence: 'high', vote_count: 21, summary: 'Opposes pathways to citizenship and most immigration reform packages.' },
    { category: 'financial_regulation', label: 'Anti-financial regulation', score: 0.88, direction: 'against', confidence: 'medium', vote_count: 17, summary: 'Votes to reduce financial oversight and repeal Dodd-Frank provisions.' },
    { category: 'foreign_policy', label: 'Pro-Israel (AIPAC aligned)', score: 0.96, direction: 'for', confidence: 'high', vote_count: 14, summary: 'Strongly aligned with AIPAC policy positions; votes for all Israel security assistance.' },
  ],
  'O000172': [
    { category: 'climate_environment', label: 'Pro-climate legislation', score: 0.99, direction: 'for', confidence: 'high', vote_count: 31, summary: 'Primary sponsor of Green New Deal; votes for every climate-related measure.' },
    { category: 'healthcare', label: 'Pro-universal healthcare', score: 0.99, direction: 'for', confidence: 'high', vote_count: 27, summary: 'Vocal Medicare-for-All advocate; votes against any bill that weakens ACA.' },
    { category: 'reproductive_rights', label: 'Pro-reproductive rights', score: 0.98, direction: 'for', confidence: 'high', vote_count: 18, summary: 'Votes for reproductive rights legislation without exception.' },
    { category: 'immigration', label: 'Pro-immigration reform', score: 0.97, direction: 'for', confidence: 'high', vote_count: 22, summary: 'Advocates for open pathways to citizenship; opposes border wall funding.' },
    { category: 'defense_spending', label: 'Anti-defense spending', score: 0.82, direction: 'against', confidence: 'medium', vote_count: 15, summary: 'Has voted to cut defense spending and reallocate to social programs.' },
    { category: 'financial_regulation', label: 'Pro-financial regulation', score: 0.96, direction: 'for', confidence: 'high', vote_count: 20, summary: 'Co-sponsors bills targeting Wall Street; supported breaking up big banks.' },
  ],
  'G000596': [
    { category: 'gun_control', label: 'Anti-gun control', score: 0.99, direction: 'against', confidence: 'high', vote_count: 12, summary: 'Has voted against every gun control measure; vocal Second Amendment absolutist.' },
    { category: 'reproductive_rights', label: 'Anti-abortion rights', score: 0.98, direction: 'against', confidence: 'high', vote_count: 10, summary: 'Supports complete abortion ban with no exceptions for rape or incest.' },
    { category: 'climate_environment', label: 'Anti-climate legislation', score: 0.97, direction: 'against', confidence: 'high', vote_count: 14, summary: 'Denies scientific consensus on climate change; opposes all climate regulation.' },
    { category: 'foreign_policy', label: 'Anti-Ukraine aid', score: 0.94, direction: 'against', confidence: 'high', vote_count: 9, summary: 'Voted against all Ukraine security assistance packages.' },
    { category: 'immigration', label: 'Anti-immigration', score: 0.96, direction: 'against', confidence: 'high', vote_count: 11, summary: 'Strong border hawk; supports mass deportation policies.' },
    { category: 'voting_rights', label: 'Anti-voting rights expansion', score: 0.91, direction: 'against', confidence: 'medium', vote_count: 8, summary: 'Voted against voting rights protections and opposed 2020 election certification.' },
  ],
  'W000817': [
    { category: 'financial_regulation', label: 'Pro-financial regulation', score: 0.98, direction: 'for', confidence: 'high', vote_count: 44, summary: 'Architect of the CFPB; has made financial regulation the cornerstone of her career.' },
    { category: 'healthcare', label: 'Pro-universal healthcare', score: 0.96, direction: 'for', confidence: 'high', vote_count: 32, summary: 'Consistent advocate for Medicare expansion and drug price negotiation.' },
    { category: 'reproductive_rights', label: 'Pro-reproductive rights', score: 0.99, direction: 'for', confidence: 'high', vote_count: 22, summary: 'Votes for reproductive rights in every instance; key sponsor of WHPA.' },
    { category: 'tech_privacy', label: 'Pro-tech regulation', score: 0.87, direction: 'for', confidence: 'medium', vote_count: 19, summary: 'Supports breaking up Big Tech and strengthening data privacy laws.' },
    { category: 'labor_unions', label: 'Pro-labor unions', score: 0.91, direction: 'for', confidence: 'high', vote_count: 28, summary: 'Consistently votes for labor protections and union organizing rights.' },
    { category: 'taxation_fiscal', label: 'Pro-wealth taxation', score: 0.94, direction: 'for', confidence: 'high', vote_count: 24, summary: 'Proposed the Ultra-Millionaire Tax; votes for progressive taxation.' },
  ],
  'P000197': [
    { category: 'reproductive_rights', label: 'Pro-reproductive rights', score: 0.99, direction: 'for', confidence: 'high', vote_count: 61, summary: 'Unwavering champion of reproductive rights across four decades in Congress.' },
    { category: 'healthcare', label: 'Pro-ACA / healthcare access', score: 0.98, direction: 'for', confidence: 'high', vote_count: 49, summary: 'Led passage of the ACA; votes against every attempt to weaken it.' },
    { category: 'immigration', label: 'Pro-immigration reform', score: 0.92, direction: 'for', confidence: 'high', vote_count: 38, summary: 'Supports comprehensive immigration reform and DACA protections.' },
    { category: 'gun_control', label: 'Pro-gun control', score: 0.95, direction: 'for', confidence: 'high', vote_count: 42, summary: 'Led House passage of universal background check legislation.' },
    { category: 'foreign_policy', label: 'Pro-Israel', score: 0.89, direction: 'for', confidence: 'medium', vote_count: 31, summary: 'Strong supporter of US-Israel alliance; votes for security assistance.' },
    { category: 'climate_environment', label: 'Pro-climate legislation', score: 0.94, direction: 'for', confidence: 'high', vote_count: 45, summary: 'Supported every major climate bill; championed the Inflation Reduction Act.' },
  ],
  'W000779': [
    { category: 'tech_privacy', label: 'Pro-internet privacy', score: 0.93, direction: 'for', confidence: 'high', vote_count: 26, summary: 'Led bipartisan internet privacy legislation; opposes mass surveillance.' },
    { category: 'financial_regulation', label: 'Pro-financial regulation', score: 0.88, direction: 'for', confidence: 'high', vote_count: 34, summary: 'Long-time member of Finance Committee; votes for consumer protection.' },
    { category: 'healthcare', label: 'Pro-drug price reform', score: 0.91, direction: 'for', confidence: 'high', vote_count: 21, summary: 'Key sponsor of drug pricing reform legislation; supports Medicare negotiation.' },
    { category: 'reproductive_rights', label: 'Pro-reproductive rights', score: 0.97, direction: 'for', confidence: 'high', vote_count: 19, summary: 'Consistent advocate; co-sponsored Women\'s Health Protection Act.' },
    { category: 'climate_environment', label: 'Pro-climate legislation', score: 0.89, direction: 'for', confidence: 'high', vote_count: 31, summary: 'Votes for major climate bills; supported IRA climate provisions.' },
    { category: 'drug_policy', label: 'Pro-cannabis reform', score: 0.84, direction: 'for', confidence: 'medium', vote_count: 12, summary: 'Supports federal cannabis decriminalization and banking access for dispensaries.' },
  ],
  'C000880': [
    { category: 'taxation_fiscal', label: 'Pro-tax cuts', score: 0.94, direction: 'for', confidence: 'high', vote_count: 28, summary: 'Voted for the 2017 Tax Cuts and Jobs Act; consistently supports tax reduction.' },
    { category: 'financial_regulation', label: 'Anti-financial regulation', score: 0.89, direction: 'against', confidence: 'high', vote_count: 22, summary: 'Votes to reduce regulatory burden on banks and financial institutions.' },
    { category: 'reproductive_rights', label: 'Anti-abortion rights', score: 0.93, direction: 'against', confidence: 'high', vote_count: 16, summary: 'Votes against reproductive rights legislation; supports fetal personhood bills.' },
    { category: 'gun_control', label: 'Anti-gun control', score: 0.91, direction: 'against', confidence: 'high', vote_count: 14, summary: 'NRA-endorsed; opposes background check expansion and red flag laws.' },
    { category: 'climate_environment', label: 'Anti-climate regulation', score: 0.86, direction: 'against', confidence: 'medium', vote_count: 19, summary: 'Votes against EPA regulations and opposes carbon pricing legislation.' },
    { category: 'immigration', label: 'Anti-immigration reform', score: 0.88, direction: 'against', confidence: 'high', vote_count: 17, summary: 'Opposes pathways to citizenship; supports enhanced border enforcement.' },
  ],
};

const MOCK_VOTES = {
  'S000033': [
    { id: 1, position: 'Yes', question: 'On Passage', description: 'American Rescue Plan Act of 2021', vote_date: '2021-03-06', congress: 117, title: 'American Rescue Plan Act of 2021', short_title: 'American Rescue Plan', primary_subject: 'Economics and Public Finance' },
    { id: 2, position: 'Yes', question: 'On Passage', description: 'Inflation Reduction Act of 2022', vote_date: '2022-08-07', congress: 117, title: 'Inflation Reduction Act of 2022', short_title: 'Inflation Reduction Act', primary_subject: 'Taxation' },
    { id: 3, position: 'No', question: 'On Passage', description: 'National Defense Authorization Act FY2024', vote_date: '2023-12-13', congress: 118, title: 'NDAA FY2024', short_title: 'NDAA FY2024', primary_subject: 'Armed Forces and National Security' },
    { id: 4, position: 'Yes', question: 'On Passage', description: 'Women\'s Health Protection Act of 2022', vote_date: '2022-05-11', congress: 117, title: 'Women\'s Health Protection Act', short_title: 'WHPA', primary_subject: 'Health' },
    { id: 5, position: 'No', question: 'On Cloture', description: 'Israel Security Supplemental Appropriations Act', vote_date: '2024-02-08', congress: 118, title: 'Israel Security Supplemental', short_title: 'Israel Aid Package', primary_subject: 'International Affairs' },
    { id: 6, position: 'Yes', question: 'On Passage', description: 'Bipartisan Background Checks Act of 2023', vote_date: '2023-09-20', congress: 118, title: 'Bipartisan Background Checks Act', short_title: 'Background Checks Act', primary_subject: 'Crime and Law Enforcement' },
  ],
  'C001098': [
    { id: 10, position: 'No', question: 'On Passage', description: 'American Rescue Plan Act of 2021', vote_date: '2021-03-06', congress: 117, title: 'American Rescue Plan Act', short_title: 'American Rescue Plan', primary_subject: 'Economics and Public Finance' },
    { id: 11, position: 'No', question: 'On Passage', description: 'Inflation Reduction Act of 2022', vote_date: '2022-08-07', congress: 117, title: 'Inflation Reduction Act', short_title: 'Inflation Reduction Act', primary_subject: 'Taxation' },
    { id: 12, position: 'No', question: 'On Passage', description: 'Women\'s Health Protection Act', vote_date: '2022-05-11', congress: 117, title: 'Women\'s Health Protection Act', short_title: 'WHPA', primary_subject: 'Health' },
    { id: 13, position: 'Yes', question: 'On Passage', description: 'Israel Security Supplemental', vote_date: '2024-02-08', congress: 118, title: 'Israel Security Supplemental', short_title: 'Israel Aid Package', primary_subject: 'International Affairs' },
    { id: 14, position: 'No', question: 'On Passage', description: 'Bipartisan Background Checks Act', vote_date: '2023-09-20', congress: 118, title: 'Bipartisan Background Checks Act', short_title: 'Background Checks Act', primary_subject: 'Crime and Law Enforcement' },
    { id: 15, position: 'No', question: 'On Passage', description: 'SAFE Banking Act', vote_date: '2023-09-27', congress: 118, title: 'SAFE Banking Act', short_title: 'SAFE Banking Act', primary_subject: 'Finance and Financial Sector' },
  ],
};

// ZIP code → representative mapping (sample cities)
const ZIP_TO_REPS = {
  // New York City
  '10001': { state: 'NY', city: 'New York', repIds: ['O000172', 'W000817'] },
  '10014': { state: 'NY', city: 'New York', repIds: ['O000172', 'W000817'] },
  // Los Angeles
  '90210': { state: 'CA', city: 'Beverly Hills', repIds: ['P000197', 'W000779'] },
  '90001': { state: 'CA', city: 'Los Angeles', repIds: ['P000197', 'W000779'] },
  // Chicago
  '60601': { state: 'IL', city: 'Chicago', repIds: ['W000817', 'C000880'] },
  // Houston
  '77001': { state: 'TX', city: 'Houston', repIds: ['G000596', 'C001098'] },
  '77002': { state: 'TX', city: 'Houston', repIds: ['G000596', 'C001098'] },
  // Boston
  '02101': { state: 'MA', city: 'Boston', repIds: ['W000817', 'O000172'] },
  '02108': { state: 'MA', city: 'Boston', repIds: ['W000817', 'O000172'] },
  // Idaho
  '83701': { state: 'ID', city: 'Boise', repIds: ['C000880', 'C001098'] },
  // Vermont
  '05401': { state: 'VT', city: 'Burlington', repIds: ['S000033', 'W000779'] },
  // Oregon
  '97201': { state: 'OR', city: 'Portland', repIds: ['W000779', 'O000172'] },
};

// Default fallback for unknown ZIPs
const DEFAULT_REPS = ['W000817', 'C001098'];

function getRepIdsForZip(zip) {
  return ZIP_TO_REPS[zip] || {
    state: 'US', city: 'Unknown City',
    repIds: DEFAULT_REPS,
  };
}

function buildRepresentativeResponse(zip) {
  const { state, city, repIds } = getRepIdsForZip(zip);

  const representatives = repIds.map(id => {
    const pol = MOCK_POLITICIANS[id];
    if (!pol) return null;
    const biasScores = MOCK_BIAS_SCORES[id] || [];
    const aiAnalysis = buildAiAnalysis(id, pol, biasScores);

    return {
      name: pol.full_name,
      office: pol.chamber === 'senate'
        ? `${state} — U.S. Senate`
        : `${state} ${pol.district}th Congressional District`,
      level: 'federal',
      role: pol.chamber === 'senate' ? 'senator' : 'representative',
      party: pol.party,
      phone: '(202) 224-0000',
      url: pol.url,
      photoUrl: null,
      bioguideId: id,
      profile: {
        id: pol.id,
        fullName: pol.full_name,
        party: pol.party,
        state: pol.state,
        chamber: pol.chamber,
        district: pol.district,
        title: pol.title,
        totalVotes: pol.total_votes,
        missedVotesPct: pol.missed_votes_pct,
        partyLoyaltyPct: pol.party_loyalty_pct,
        dwNominate: pol.dw_nominate,
        nextElection: pol.next_election,
        twitterHandle: pol.twitter_handle,
        biasScores,
        aiAnalysis,
      },
      hasBiasData: biasScores.length > 0,
      hasVoteData: true,
    };
  }).filter(Boolean);

  return { state, city, zip, representatives, pendingAnalysis: [] };
}

function buildAiAnalysis(id, pol, biases) {
  const summaries = {
    'S000033': 'Senator Sanders votes as one of the most progressive members of Congress, with an unwavering focus on wealth inequality, healthcare access, and labor rights. His independent status reflects genuine ideological independence from mainstream Democratic positions on military spending and foreign intervention.',
    'C001098': 'Senator Cruz consistently occupies the far-right of the Republican caucus, with near-perfect scores on social conservatism, deregulation, and opposition to climate policy. His high missed-vote rate stands out as an anomaly given his otherwise high party loyalty.',
    'O000172': 'Representative Ocasio-Cortez votes as one of the most progressive members of the House, defining the left flank of the Democratic Party. Her voting record shows remarkable consistency across economic, social, and environmental issues.',
    'G000596': 'Representative Taylor Greene votes in the populist-nationalist wing of the Republican Party, characterized by opposition to foreign aid, climate policy, and democratic norms. She breaks from the Republican mainstream on Ukraine assistance.',
    'W000817': 'Senator Warren\'s voting record reveals a coherent economic populism centered on financial regulation, consumer protection, and wealth taxation. Her work creating the CFPB represents a durable legislative legacy.',
    'P000197': 'Representative Pelosi\'s decades-long record reflects establishment Democratic orthodoxy, combining social liberalism with a pragmatic approach to foreign policy and defense spending that sometimes diverges from her party\'s progressive wing.',
    'W000779': 'Senator Wyden occupies a pragmatic center-left position, known for bipartisan work on tax and internet policy while maintaining reliable liberal positions on social issues.',
    'C000880': 'Senator Crapo votes as a reliable mainstream conservative, with particular emphasis on financial deregulation and tax policy reflecting Idaho\'s business-oriented political culture.',
  };

  return {
    biases,
    overall_summary: summaries[id] || 'Voting record shows consistent ideological patterns across multiple policy areas.',
    anomalies: [
      pol.missed_votes_pct > 10 ? `High missed vote rate of ${pol.missed_votes_pct}% — well above the congressional average of ~3%.` : null,
      pol.party_loyalty_pct < 85 ? `Party loyalty of ${pol.party_loyalty_pct}% is notably below average, suggesting meaningful independence from party leadership.` : null,
    ].filter(Boolean),
    dominant_ideology: pol.dw_nominate < -0.5 ? 'progressive' : pol.dw_nominate < -0.1 ? 'liberal' : pol.dw_nominate < 0.1 ? 'moderate' : pol.dw_nominate < 0.5 ? 'conservative' : 'far-conservative',
    voteCount: pol.total_votes,
  };
}

function getMockVotes(politicianId, page = 0) {
  const allVotes = MOCK_VOTES[politicianId] || generateGenericVotes(politicianId);
  const limit = 25;
  const offset = page * limit;
  return {
    votes: allVotes.slice(offset, offset + limit),
    total: allVotes.length,
    page,
    pages: Math.ceil(allVotes.length / limit),
  };
}

function generateGenericVotes(id) {
  const pol = MOCK_POLITICIANS[id];
  if (!pol) return [];
  const isConservative = pol.dw_nominate > 0;
  return [
    { id: 100, position: isConservative ? 'No' : 'Yes', question: 'On Passage', description: 'Affordable Care Act Amendment', vote_date: '2023-11-14', congress: 118, title: 'ACA Improvement Act', short_title: 'ACA Improvement Act', primary_subject: 'Health' },
    { id: 101, position: isConservative ? 'No' : 'Yes', question: 'On Passage', description: 'Climate and Clean Energy Jobs Act', vote_date: '2023-10-02', congress: 118, title: 'Climate and Clean Energy Jobs Act', short_title: 'Climate Jobs Act', primary_subject: 'Environmental Protection' },
    { id: 102, position: isConservative ? 'Yes' : 'No', question: 'On Passage', description: 'National Defense Authorization Act', vote_date: '2023-12-13', congress: 118, title: 'NDAA FY2024', short_title: 'NDAA FY2024', primary_subject: 'Armed Forces and National Security' },
    { id: 103, position: isConservative ? 'No' : 'Yes', question: 'On Passage', description: 'Voting Rights Advancement Act', vote_date: '2023-08-24', congress: 118, title: 'Voting Rights Advancement Act', short_title: 'VRAA', primary_subject: 'Civil Rights and Liberties' },
  ];
}

module.exports = {
  MOCK_POLITICIANS,
  MOCK_BIAS_SCORES,
  MOCK_VOTES,
  buildRepresentativeResponse,
  getMockVotes,
  isMockMode: () => !process.env.PROPUBLICA_API_KEY || process.env.PROPUBLICA_API_KEY === 'your_propublica_key_here',
};
