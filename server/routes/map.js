const express = require('express');
const { sql } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /map/heatmap — get all zones with coverage data
router.get('/heatmap', authMiddleware, async (req, res) => {
  try {
    const zones = await sql`
      SELECT market, market_section, county, sector, lat, lng,
             datapoint_count, target_count, last_collected, priority_score,
             CASE
               WHEN datapoint_count = 0 THEN 'critical'
               WHEN datapoint_count < target_count * 0.3 THEN 'low'
               WHEN datapoint_count < target_count * 0.7 THEN 'medium'
               ELSE 'good'
             END as coverage_status
      FROM heatmap_zones
      ORDER BY priority_score DESC
    `;
    res.json(zones);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /map/missions — today's priority zones for this scout
router.get('/missions', authMiddleware, async (req, res) => {
  try {
    const missions = await sql`
      SELECT h.market, h.market_section, h.county, h.sector,
             h.lat, h.lng, h.datapoint_count, h.target_count,
             h.priority_score,
             COALESCE(today.count, 0) as collected_today
      FROM heatmap_zones h
      LEFT JOIN (
        SELECT market, market_section, sector, COUNT(*) as count
        FROM scout_datapoints
        WHERE scout_id = ${req.scout.id}
        AND collected_at > NOW() - INTERVAL '24 hours'
        GROUP BY market, market_section, sector
      ) today ON today.market = h.market
        AND today.market_section IS NOT DISTINCT FROM h.market_section
        AND today.sector = h.sector
      WHERE h.datapoint_count < h.target_count
      ORDER BY h.priority_score DESC
      LIMIT 10
    `;
    res.json(missions);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /map/sectors — get interview guidance for a sector
router.get('/guidance/:market/:sector', authMiddleware, async (req, res) => {
  try {
    const { market, sector } = req.params;
    const guidance = getInterviewGuidance(market, sector);
    res.json(guidance);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

function getInterviewGuidance(market, sector) {
  const sectorLower = sector.toLowerCase();

  const greetings = {
    kiswahili: [
      'Habari yako mama/mzee.',
      'Jina langu ni [jina lako], natoka AfriFoundry.',
      'Tunakusanya bei za soko kusaidia wafanyabiashara na wakulima Kenya.',
      'Je, unaweza kunisaidia kidogo?'
    ],
    english: [
      'Good morning/afternoon.',
      'My name is [your name], I am from AfriFoundry.',
      'We collect market prices to help businesses and farmers across Kenya.',
      'Can you help me for just a moment?'
    ]
  };

  const sectorQuestions = {
    agriculture: [
      { q: 'Bei ya [bidhaa] leo ni ngapi?', q_en: 'What is the price of [commodity] today?', field: 'price' },
      { q: 'Unauzaje — kwa kilo, debe, au gunia?', q_en: 'How do you sell — per kg, debe, or sack?', field: 'unit' },
      { q: 'Bidhaa hii inatoka wapi?', q_en: 'Where does this commodity come from?', field: 'source' },
      { q: 'Bei hii ni ya jumla au rejareja?', q_en: 'Is this price wholesale or retail?', field: 'seller_type' },
      { q: 'Bei imebadilika wiki iliyopita?', q_en: 'Has the price changed from last week?', field: 'price_trend' },
    ],
    retail: [
      { q: 'Bei ya [bidhaa] ni ngapi?', q_en: 'What is the price of [item]?', field: 'price' },
      { q: 'Hii ni price ya rejareja?', q_en: 'Is this the retail price?', field: 'seller_type' },
      { q: 'Kwa jumla bei ni ngapi?', q_en: 'What is the wholesale price?', field: 'wholesale_price' },
    ],
    electronics: [
      { q: 'Bei ya [bidhaa] ni ngapi?', q_en: 'What is the price of [item]?', field: 'price' },
      { q: 'Hii ni mpya au ya pili?', q_en: 'Is this new or second-hand?', field: 'condition' },
      { q: 'Kuna warranty?', q_en: 'Is there a warranty?', field: 'warranty' },
    ],
  };

  const declines = {
    kiswahili: 'Sawa kabisa, asante sana kwa wakati wako.',
    english: 'No problem at all, thank you for your time.'
  };

  return {
    market,
    sector,
    greetings,
    questions: sectorQuestions[sectorLower] || sectorQuestions.retail,
    declines,
    tips: getSectorTips(market, sector),
  };
}

function getSectorTips(market, sector) {
  const tips = {
    'Kongowea': 'Anza na sokondogo kwa ndizi. Sellers wanafanya kazi mapema asubuhi. Uwe mkarimu na mfupi — wana wateja wengi.',
    'Gikomba': 'Section za bidhaa ziko tofauti. Anza na jumla kisha rejareja. Photographers wanajulikana vibaya — use stealth mode.',
    'China Square': 'Use barcode scanner. Usichukue picha wazi — tumia stealth mode. Weka simu kama unaangalia bei tu.',
    'default': 'Ongea kwa upole na haraka. Maswali mawili matatu tu kwa seller mmoja. Usisimame muda mrefu mahali pamoja.',
  };
  return tips[market] || tips['default'];
}

module.exports = router;
