// src/routes/notifications.js
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const db      = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'votematch-dev-secret';

function verifyJwt(token) {
  try {
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const payload = verifyJwt(auth.slice(7));
  if (!payload?.userId) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = String(payload.userId);
  next();
}

// GET /api/notifications/prefs
router.get('/prefs', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT vote_alerts FROM user_notification_prefs WHERE user_id = $1',
      [req.userId]
    );
    res.json(rows[0] || { vote_alerts: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/prefs
router.patch('/prefs', requireAuth, async (req, res) => {
  const { vote_alerts } = req.body;
  if (typeof vote_alerts !== 'boolean') {
    return res.status(400).json({ error: 'vote_alerts (boolean) required' });
  }
  try {
    await db.query(`
      INSERT INTO user_notification_prefs (user_id, vote_alerts, unsubscribe_token)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE SET vote_alerts = $2
    `, [req.userId, vote_alerts, crypto.randomBytes(20).toString('hex')]);
    res.json({ vote_alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications/unsubscribe?token=xxx  (no auth — link in email)
router.get('/unsubscribe', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Missing token.');
  try {
    const { rows } = await db.query(
      'UPDATE user_notification_prefs SET vote_alerts = false WHERE unsubscribe_token = $1 RETURNING user_id',
      [token]
    );
    if (!rows.length) return res.status(404).send('Invalid or already used token.');
    res.redirect('https://votematch.app/?unsubscribed=1');
  } catch (err) {
    res.status(500).send('Server error.');
  }
});

module.exports = router;
