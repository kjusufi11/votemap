# VoteMap

Track how politicians vote. Surface their real ideological biases with AI.

## Architecture

```
votemap/
├── backend/          Node.js + Express + PostgreSQL
│   └── src/
│       ├── db/       Database connection + migrations
│       ├── routes/   API endpoints
│       └── services/ ProPublica, Google Civic, Claude AI, sync
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
    → Match names to ProPublica bioguide IDs
    → Pull vote history from ProPublica (or our DB cache)
    → Claude analyzes vote patterns → bias scores
    → Display politician profiles with bias meters
```

## Setup

### 1. Get API keys

| Service | URL | Cost |
|---------|-----|------|
| ProPublica Congress API | https://www.propublica.org/datastore/api/propublica-congress-api | Free |
| Google Civic Information API | https://console.cloud.google.com → Enable "Civic Information API" | Free (generous quota) |
| Anthropic API | https://console.anthropic.com | Pay-per-use (~$0.01 per analysis) |

### 2. Set up PostgreSQL

```bash
# Mac
brew install postgresql
brew services start postgresql
createdb votemap

# Ubuntu
sudo apt install postgresql
sudo -u postgres createdb votemap
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
- [x] ProPublica sync service
- [x] Google Civic ZIP → representatives lookup
- [x] Claude AI bias analysis engine
- [x] Core API routes
- [ ] Frontend: ZIP entry page
- [ ] Frontend: Representative cards
- [ ] Frontend: Politician profile + bias visualization
- [ ] Frontend: Vote history browser
- [ ] State legislators (currently federal only)
- [ ] Nightly sync cron job
- [ ] Email alerts when your rep votes on a tracked issue

## Notes on data

- **Federal only for now**: ProPublica covers the US Congress. State legislature
  data is harder — each state has its own source. OpenStates.org covers most.
- **Bias scores are AI-generated**: They're computed from voting *patterns*,
  not party affiliation. A Democrat who votes against gun control 80% of the
  time will show that pattern regardless of party.
- **ProPublica rate limits**: Free tier is ~1 req/sec. The sync service respects
  this automatically.
