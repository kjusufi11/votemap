// src/index.js
// VoteMap API server

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const lookupRoutes = require('./routes/lookup');
const politicianRoutes = require('./routes/politicians');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL, /\.railway\.app$/].filter(Boolean)
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // cron / curl / server-to-server
    const ok = allowedOrigins.some(o =>
      typeof o === 'string' ? o === origin : o.test(origin)
    );
    cb(ok ? null : new Error('CORS: origin not allowed'), ok);
  },
  credentials: true,
}));

app.use(express.json());

// Rate limiting — protect external API keys
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again in 15 minutes.' },
});
app.use('/api/', limiter);

// Stricter limit on analysis endpoint (Claude API costs money)
const analysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Analysis rate limit reached. Please try again in an hour.' },
});
app.use('/api/politicians/:id/analyze', analysisLimiter);

// Routes
app.use('/api/lookup', lookupRoutes);
app.use('/api/politicians', politicianRoutes);

// Health check — Railway uses this to know the service is alive
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: process.env.MOCK_MODE === 'true' ? 'mock' : 'live',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// Start
app.listen(PORT, () => {
  console.log(`\nVoteMap API running on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health\n`);

  const required = ['PROPUBLICA_API_KEY', 'GOOGLE_CIVIC_API_KEY', 'ANTHROPIC_API_KEY', 'DATABASE_URL'];
  const missing = required.filter(k => !process.env[k] || process.env[k].startsWith('your_'));
  if (missing.length) {
    console.warn('Missing or placeholder env vars:', missing.join(', '));
    console.warn('Running in MOCK MODE — set real keys to enable live data.\n');
  }
});

module.exports = app;
