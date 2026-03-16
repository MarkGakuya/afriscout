const express = require('express');
const { sql } = require('../db/schema');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const EARNINGS_PER_50 = 250; // KES per 50 verified datapoints

// GET /scout/profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const [scout] = await sql`
      SELECT id, name, email, phone, zone, status, quality_score,
             total_datapoints, verified_datapoints, earnings_pending, earnings_paid,
             created_at, last_active
      FROM scouts WHERE id = ${req.scout.id}
    `;

    const todayStats = await sql`
      SELECT COUNT(*) as count,
             AVG(confidence_score) as avg_confidence
      FROM scout_datapoints
      WHERE scout_id = ${req.scout.id}
      AND collected_at > NOW() - INTERVAL '24 hours'
    `;

    const weekStats = await sql`
      SELECT COUNT(*) as count
      FROM scout_datapoints
      WHERE scout_id = ${req.scout.id}
      AND collected_at > NOW() - INTERVAL '7 days'
    `;

    const recentSessions = await sql`
      SELECT market, market_section, sector, started_at, datapoints_collected
      FROM scout_sessions
      WHERE scout_id = ${req.scout.id}
      ORDER BY started_at DESC
      LIMIT 5
    `;

    res.json({
      ...scout,
      stats: {
        today: parseInt(todayStats[0]?.count || 0),
        this_week: parseInt(weekStats[0]?.count || 0),
        avg_confidence_today: parseFloat(todayStats[0]?.avg_confidence || 0).toFixed(2),
      },
      recent_sessions: recentSessions,
      next_milestone: Math.ceil(scout.verified_datapoints / 50) * 50,
      next_payout: EARNINGS_PER_50,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /scout/leaderboard
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const leaders = await sql`
      SELECT name, zone, verified_datapoints, quality_score,
             RANK() OVER (ORDER BY verified_datapoints DESC) as rank
      FROM scouts
      WHERE status = 'active'
      ORDER BY verified_datapoints DESC
      LIMIT 10
    `;
    res.json(leaders);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /scout/datapoints — recent datapoints for this scout
router.get('/datapoints', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const datapoints = await sql`
      SELECT id, market, market_section, sector, commodity, unit, price,
             confidence_score, status, collected_at, lat, lng
      FROM scout_datapoints
      WHERE scout_id = ${req.scout.id}
      ORDER BY collected_at DESC
      LIMIT ${limit}
    `;
    res.json(datapoints);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /scout/session/start
router.post('/session/start', authMiddleware, async (req, res) => {
  try {
    const { market, market_section, county, sector } = req.body;
    const [session] = await sql`
      INSERT INTO scout_sessions (scout_id, market, market_section, county, sector, started_at)
      VALUES (${req.scout.id}, ${market}, ${market_section || null}, ${county || null}, ${sector || null}, NOW())
      RETURNING id, market, market_section, sector, started_at
    `;
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /scout/session/:id/end
router.post('/session/:id/end', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const [count] = await sql`
      SELECT COUNT(*) as count FROM scout_datapoints
      WHERE session_id = ${id}::uuid AND scout_id = ${req.scout.id}
    `;
    await sql`
      UPDATE scout_sessions
      SET ended_at = NOW(), status = 'completed', datapoints_collected = ${parseInt(count?.count || 0)}
      WHERE id = ${id}::uuid AND scout_id = ${req.scout.id}
    `;
    res.json({ success: true, datapoints_collected: parseInt(count?.count || 0) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: list all scouts
router.get('/all', adminMiddleware, async (req, res) => {
  try {
    const scouts = await sql`
      SELECT id, name, email, zone, status, quality_score,
             total_datapoints, verified_datapoints, earnings_pending, last_active
      FROM scouts ORDER BY total_datapoints DESC
    `;
    res.json(scouts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
