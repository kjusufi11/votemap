// src/db/index.js
// Shared PostgreSQL connection pool
// In mock mode (no real API keys), DB calls are silently skipped.

const { Pool } = require('pg');

const isMock = !process.env.DATABASE_URL ||
  process.env.MOCK_MODE === 'true' ||
  !process.env.PROPUBLICA_API_KEY ||
  process.env.PROPUBLICA_API_KEY === 'your_propublica_key_here';

let pool = null;

if (!isMock) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  pool.on('error', (err) => {
    console.error('Unexpected DB pool error:', err.message);
  });
}

// Stub query that returns empty results in mock mode
const noopQuery = async () => ({ rows: [], rowCount: 0 });

module.exports = {
  query: isMock ? noopQuery : (text, params) => pool.query(text, params),
  getClient: isMock ? async () => ({ query: noopQuery, release: () => {} }) : () => pool.connect(),
  pool,
  isMock,
};
