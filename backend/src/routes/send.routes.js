const express = require('express');

const {
  startSending,
  stopSending,
  getSendingStatus,
  resetSendingStatus
} = require('../controllers/send.controller');

const router = express.Router();

router.post('/start', startSending);
router.post('/stop', stopSending);
router.get('/status', getSendingStatus);
router.post('/reset', resetSendingStatus);

module.exports = router;