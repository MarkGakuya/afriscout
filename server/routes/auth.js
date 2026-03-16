const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sql } = require('../db/schema');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const [scout] = await sql`
      SELECT * FROM scouts WHERE email = ${email.toLowerCase()} AND status = 'active'
    `;
    if (!scout) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, scout.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    await sql`UPDATE scouts SET last_active = NOW() WHERE id = ${scout.id}`;

    const token = jwt.sign(
      { id: scout.id, email: scout.email, name: scout.name, zone: scout.zone },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      scout: {
        id: scout.id,
        name: scout.name,
        email: scout.email,
        zone: scout.zone,
        quality_score: scout.quality_score,
        total_datapoints: scout.total_datapoints,
        verified_datapoints: scout.verified_datapoints,
        earnings_pending: scout.earnings_pending,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /auth/register — admin only
router.post('/register', adminMiddleware, async (req, res) => {
  try {
    const { name, email, password, phone, zone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, password required' });
    }
    const hash = await bcrypt.hash(password, 12);
    const [scout] = await sql`
      INSERT INTO scouts (name, email, password_hash, phone, zone)
      VALUES (${name}, ${email.toLowerCase()}, ${hash}, ${phone || null}, ${zone || null})
      RETURNING id, name, email, zone
    `;
    res.status(201).json({ message: 'Scout account created', scout });
  } catch (err) {
    if (err.message?.includes('unique')) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const [scout] = await sql`
      SELECT id, name, email, phone, zone, status, quality_score,
             total_datapoints, verified_datapoints, earnings_pending,
             earnings_paid, created_at, last_active
      FROM scouts WHERE id = ${req.scout.id}
    `;
    if (!scout) return res.status(404).json({ error: 'Not found' });
    res.json(scout);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
