require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./db/schema');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:3000',
    'https://collector.afrifoundry.com',
    'http://localhost:3000',
  ],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' })); // 10mb for photo data
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, try again later' }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'AfriScout API',
    version: '1.0.0',
    time: new Date().toISOString(),
  });
});

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/sync', require('./routes/sync'));
app.use('/map', require('./routes/map'));
app.use('/scout', require('./routes/scout'));

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start
async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`✓ AfriScout API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
