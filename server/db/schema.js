const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);

async function initDB() {
  try {
    // Scouts table
    await sql`
      CREATE TABLE IF NOT EXISTS scouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        zone VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        quality_score DECIMAL(5,2) DEFAULT 100.0,
        total_datapoints INTEGER DEFAULT 0,
        verified_datapoints INTEGER DEFAULT 0,
        earnings_pending DECIMAL(10,2) DEFAULT 0,
        earnings_paid DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        last_active TIMESTAMP DEFAULT NOW()
      )
    `;

    // Datapoints table
    await sql`
      CREATE TABLE IF NOT EXISTS scout_datapoints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        local_id VARCHAR(255),
        scout_id UUID REFERENCES scouts(id),
        session_id UUID,
        market VARCHAR(255) NOT NULL,
        market_section VARCHAR(255),
        county VARCHAR(255),
        sector VARCHAR(255) NOT NULL,
        commodity VARCHAR(255) NOT NULL,
        unit VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'KES',
        seller_type VARCHAR(100),
        notes TEXT,
        audio_transcript TEXT,
        notebook_text TEXT,
        confidence_score DECIMAL(5,2) DEFAULT 0.8,
        status VARCHAR(50) DEFAULT 'pending',
        lat DECIMAL(10,8),
        lng DECIMAL(11,8),
        collected_at TIMESTAMP NOT NULL,
        synced_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Photos table
    await sql`
      CREATE TABLE IF NOT EXISTS scout_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scout_id UUID REFERENCES scouts(id),
        datapoint_id UUID REFERENCES scout_datapoints(id),
        local_id VARCHAR(255),
        photo_type VARCHAR(50) NOT NULL,
        data_url TEXT,
        market VARCHAR(255),
        market_section VARCHAR(255),
        county VARCHAR(255),
        sector VARCHAR(255),
        lat DECIMAL(10,8),
        lng DECIMAL(11,8),
        captured_at TIMESTAMP NOT NULL,
        synced_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS scout_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scout_id UUID REFERENCES scouts(id),
        market VARCHAR(255) NOT NULL,
        market_section VARCHAR(255),
        county VARCHAR(255),
        sector VARCHAR(255),
        started_at TIMESTAMP NOT NULL,
        ended_at TIMESTAMP,
        datapoints_collected INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active'
      )
    `;

    // Heatmap zones table
    await sql`
      CREATE TABLE IF NOT EXISTS heatmap_zones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        market VARCHAR(255) NOT NULL,
        market_section VARCHAR(255),
        county VARCHAR(255) NOT NULL,
        sector VARCHAR(255) NOT NULL,
        lat DECIMAL(10,8),
        lng DECIMAL(11,8),
        datapoint_count INTEGER DEFAULT 0,
        target_count INTEGER DEFAULT 50,
        last_collected TIMESTAMP,
        priority_score DECIMAL(5,2) DEFAULT 5.0,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(market, market_section, sector)
      )
    `;

    // Seed initial heatmap zones
    await sql`
      INSERT INTO heatmap_zones (market, market_section, county, sector, lat, lng, target_count, priority_score)
      VALUES
        ('Kongowea', 'Fresh Produce', 'Mombasa', 'Agriculture', -4.0435, 39.6682, 100, 9.0),
        ('Kongowea', 'Sokondogo Bananas', 'Mombasa', 'Agriculture', -4.0440, 39.6685, 50, 8.5),
        ('Kongowea', 'Fish Section', 'Mombasa', 'Agriculture', -4.0438, 39.6680, 80, 8.0),
        ('Gikomba', 'Wholesale Produce', 'Nairobi', 'Agriculture', -1.2921, 36.8450, 100, 9.0),
        ('Gikomba', 'Clothing', 'Nairobi', 'Retail', -1.2925, 36.8448, 80, 7.5),
        ('Wakulima', 'Fresh Produce', 'Nairobi', 'Agriculture', -1.2840, 36.8300, 100, 8.5),
        ('City Market', 'Mixed Retail', 'Nairobi', 'Retail', -1.2870, 36.8230, 60, 7.0),
        ('Marikiti', 'Fresh Produce', 'Mombasa', 'Agriculture', -4.0640, 39.6680, 80, 8.0),
        ('Kibuye', 'Fresh Produce', 'Kisumu', 'Agriculture', -0.1022, 34.7617, 80, 8.5),
        ('Naivas Mombasa', 'Supermarket', 'Mombasa', 'Retail', -4.0500, 39.6600, 60, 7.0),
        ('China Square', 'Electronics', 'Nairobi', 'Electronics', -1.3000, 36.8200, 80, 8.0),
        ('Eastleigh', 'Clothing', 'Nairobi', 'Retail', -1.2750, 36.8550, 70, 7.5)
      ON CONFLICT (market, market_section, sector) DO NOTHING
    `;

    console.log('✓ AfriScout DB initialized');
  } catch (err) {
    console.error('DB init error:', err);
    throw err;
  }
}

module.exports = { sql, initDB };
