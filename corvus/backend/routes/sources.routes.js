const express = require('express');
const router = express.Router();
const {
  getHexaSourceHealth,
  syncHexaSignals,
} = require('../services/hexa-sync.service');

router.get('/hexa/health', async (req, res) => {
  try {
    const health = await getHexaSourceHealth();
    return res.json({ success: true, data: health });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/hexa/sync', async (req, res) => {
  const { date, profileId } = req.body || {};

  try {
    const summary = await syncHexaSignals({
      date,
      profileId,
      trigger: 'manual',
    });
    return res.json({ success: true, data: summary });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

module.exports = router;
