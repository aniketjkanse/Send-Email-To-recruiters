const express = require('express'); const { getPreview } = require('../controllers/preview.controller'); const router = express.Router(); router.get('/', getPreview); module.exports = router;
