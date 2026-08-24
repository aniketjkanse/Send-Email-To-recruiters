const express =
  require('express');

const {
  getPreview
} = require(
  '../controllers/preview.controller'
);

const {
  authenticateToken
} = require(
  '../middleware/auth.middleware'
);

const router =
  express.Router();

/*
 * Preview is private.
 *
 * Every preview request must contain:
 *
 * Authorization: Bearer JWT_TOKEN
 */
router.use(
  authenticateToken
);

/*
 * GET /api/preview
 */
router.get(
  '/',
  getPreview
);

module.exports =
  router;