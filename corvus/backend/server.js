require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rutas
app.use('/api/ai', require('./routes/ai.routes'));
app.use('/api/posts', require('./routes/posts.routes'));
app.use('/api/profiles', require('./routes/profiles.routes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'corvus-backend', timestamp: new Date().toISOString() });
});

// Ruta raíz
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
    }
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🦅 CORVUS Backend corriendo en puerto ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});
