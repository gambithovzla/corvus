require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

const normalizeOrigin = (value) => (value || '').replace(/\/+$/, '');
const allowedOrigins = [
  normalizeOrigin(process.env.FRONTEND_URL),
  'http://localhost:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalizedOrigin = normalizeOrigin(origin);
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/ai', require('./routes/ai.routes'));
app.use('/api/posts', require('./routes/posts.routes'));
app.use('/api/profiles', require('./routes/profiles.routes'));
app.use('/api/x', require('./routes/x.routes'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'corvus-backend', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    name: 'CORVUS API',
    version: '1.0.0',
    description: 'Social Media Command Center - Backend',
    endpoints: {
      health: 'GET /health',
      generate: 'POST /api/ai/generate',
      posts: 'GET|POST /api/posts',
      postUpdate: 'PATCH /api/posts/:id',
      profiles: 'GET|POST /api/profiles',
      seed: 'POST /api/profiles/seed',
      xAuthUrl: 'GET /api/x/auth-url?profileId=...',
      xCallback: 'GET /api/x/callback',
      xStatus: 'GET /api/x/status/:profileId',
      xPreview: 'POST /api/x/preview',
      xPublish: 'POST /api/x/publish/:postId',
    },
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CORVUS Backend corriendo en puerto ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
