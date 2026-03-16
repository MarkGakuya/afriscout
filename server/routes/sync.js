const express = require('express');
const { sql } = require('../db/schema');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /sync — bulk sync offline collected data
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { datapoints = [], photos = [], sessions = [] } = req.body;
    const scoutId = req.scout.id;
    let synced = 0;
    let photosSynced = 0;

    // Sync sessions first
    for (const session of sessions) {
      await sql`
        INSERT INTO scout_sessions (id, scout_id, market, market_section, county, sector, started_at, ended_at, datapoints_collected, status)
        VALUES (
          ${session.id}, ${scoutId}, ${session.market}, ${session.market_section || null},
          ${session.county || null}, ${session.sector || null},
          ${new Date(session.started_at)}, ${session.ended_at ? new Date(session.ended_at) : null},
          ${session.datapoints_collected || 0}, ${session.status || 'completed'}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }

    // Sync datapoints
    for (const dp of datapoints) {
      try {
        await sql`
          INSERT INTO scout_datapoints (
            id, local_id, scout_id, session_id, market, market_section, county,
            sector, commodity, unit, price, currency, seller_type, notes,
            audio_transcript, notebook_text, confidence_score, lat, lng, collected_at
          ) VALUES (
            gen_random_uuid(), ${dp.local_id}, ${scoutId}, ${dp.session_id || null},
            ${dp.market}, ${dp.market_section || null}, ${dp.county || null},
            ${dp.sector}, ${dp.commodity}, ${dp.unit}, ${dp.price},
            ${dp.currency || 'KES'}, ${dp.seller_type || null}, ${dp.notes || null},
            ${dp.audio_transcript || null}, ${dp.notebook_text || null},
            ${dp.confidence_score || 0.8}, ${dp.lat || null}, ${dp.lng || null},
            ${new Date(dp.collected_at)}
          )
          ON CONFLICT DO NOTHING
        `;
        synced++;
      } catch (err) {
        console.error('Datapoint sync error:', err.message);
      }
    }

    // Sync photos
    for (const photo of photos) {
      try {
        await sql`
          INSERT INTO scout_photos (
            local_id, scout_id, photo_type, data_url, market, market_section,
            county, sector, lat, lng, captured_at
          ) VALUES (
            ${photo.local_id}, ${scoutId}, ${photo.photo_type}, ${photo.data_url || null},
            ${photo.market || null}, ${photo.market_section || null}, ${photo.county || null},
            ${photo.sector || null}, ${photo.lat || null}, ${photo.lng || null},
            ${new Date(photo.captured_at)}
          )
          ON CONFLICT DO NOTHING
        `;
        photosSynced++;
      } catch (err) {
        console.error('Photo sync error:', err.message);
      }
    }

    // Update scout totals
    if (synced > 0) {
      await sql`
        UPDATE scouts
        SET total_datapoints = total_datapoints + ${synced},
            last_active = NOW()
        WHERE id = ${scoutId}
      `;
    }

    // Update heatmap
    for (const dp of datapoints) {
      await sql`
        INSERT INTO heatmap_zones (market, market_section, county, sector, lat, lng, datapoint_count, last_collected)
        VALUES (${dp.market}, ${dp.market_section || null}, ${dp.county || 'Kenya'}, ${dp.sector}, ${dp.lat || null}, ${dp.lng || null}, 1, NOW())
        ON CONFLICT (market, market_section, sector)
        DO UPDATE SET
          datapoint_count = heatmap_zones.datapoint_count + 1,
          last_collected = NOW(),
          updated_at = NOW()
      `;
    }

    res.json({
      success: true,
      synced_datapoints: synced,
      synced_photos: photosSynced,
      message: `Synced ${synced} datapoints and ${photosSynced} photos`
    });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// GET /sync/status — get scout's sync summary
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const [scout] = await sql`
      SELECT total_datapoints, verified_datapoints, quality_score,
             earnings_pending, earnings_paid
      FROM scouts WHERE id = ${req.scout.id}
    `;
    const recent = await sql`
      SELECT COUNT(*) as count FROM scout_datapoints
      WHERE scout_id = ${req.scout.id}
      AND collected_at > NOW() - INTERVAL '24 hours'
    `;
    res.json({
      ...scout,
      datapoints_today: parseInt(recent[0]?.count || 0),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
