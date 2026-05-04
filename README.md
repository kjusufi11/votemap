# VoteMatch

Track how politicians vote. Surface their real ideological biases with AI.

## Architecture

```
votematch/
├── backend/          Node.js + Express + PostgreSQL
│   └── src/
│       ├── db/       Database connection + migrations
│       ├── routes/   API endpoints
│       └── services/ Congress.gov, FEC, Google Civic, Claude AI, sync
└── frontend/         React + Vite
    └── src/
        ├── pages/    ZipLookup, PoliticianProfile
        ├── components/
        └── services/ API layer
```

## Data flow

```
User enters ZIP
    → Google Civic API → list of representatives (name, office, party)
    → Match to Congress.gov bioguide IDs → pull vote history (or DB cache)
    → FEC API → top donor industries → cross-reference with votes → conflict flags
    → Claude analyzes vote patterns → bias scores
    → Display politician profiles with bias meters + conflict of interest panel
```

## Setup

### 1. Get API keys

| Service | URL | Cost |
|---------|-----|------|
| Congress.gov API | https://api.congress.gov/ — register at https://api.data.gov/signup/ | Free |
| FEC API | https://api.fec.gov/v1/ — register at https://api.data.gov/signup/ | Free |
| Google Civic Information API | https://console.cloud.google.com → Enable "Civic Information API" | Free (generous quota) |
| Anthropic API | https://console.anthropic.com | Pay-per-use (~$0.01 per analysis) |

### 2. Set up PostgreSQL

```bash
# Mac
brew install postgresql
brew services start postgresql
createdb votematch

# Ubuntu
sudo apt install postgresql
sudo -u postgres createdb votematch
```

### 3. Backend

```bash
cd backend
cp .env.example .env
# Edit .env and fill in your API keys + DATABASE_URL

npm install
npm run db:migrate   # creates all tables
npm run dev          # starts on http://localhost:3001
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev          # starts on http://localhost:3000
```

## API Reference

```
POST /api/lookup/zip          { zip: "10001" }  → representatives + bias data
GET  /api/politicians/:id                       → full profile
GET  /api/politicians/:id/votes?page=0          → paginated vote history
POST /api/politicians/:id/analyze               → trigger AI bias analysis
GET  /api/politicians/:id/analysis              → get cached analysis
GET  /api/politicians?q=name&state=CA           → search
```

## Roadmap

- [x] Backend data models + DB schema
- [x] Congress.gov vote sync service
- [x] FEC donor data + conflicts of interest detector
- [x] Google Civic ZIP → representatives lookup
- [x] Claude AI bias analysis engine
- [x] Core API routes
- [x] Frontend: ZIP entry page
- [x] Frontend: Representative cards with alignment badges
- [x] Frontend: Politician profile + bias visualization
- [x] Frontend: Vote history browser
- [ ] State legislators (currently federal only)
- [ ] Email alerts when your rep votes on a tracked issue

## Notes on data

- **Federal only for now**: Congress.gov covers the US Congress. State legislature
  data is harder — each state has its own source. OpenStates.org covers most.
- **Bias scores are AI-generated**: They're computed from voting *patterns*,
  not party affiliation. A Democrat who votes against gun control 80% of the
  time will show that pattern regardless of party.
- **Conflict of interest flags**: Cross-referenced from FEC campaign finance records.
  Flagged when a top donor industry aligns with 80%+ of a politician's votes in
  that domain. Correlation, not proof of causation.
- **Congress.gov API**: Free, no rate limit concerns with caching enabled.
