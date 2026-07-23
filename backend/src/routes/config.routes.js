const express = require('express');

const {
  getSenderConfig,
  updateSenderConfig
} = require('../controllers/config.controller');

const router = express.Router();

router.get('/', getSenderConfig);
router.post('/', updateSenderConfig);

module.exports = router;