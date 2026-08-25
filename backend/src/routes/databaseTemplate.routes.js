const express = require('express');

const {
  getTemplate,
  saveTemplate,
  resetTemplate
} = require(
  '../controllers/databaseTemplate.controller'
);

const {
  authenticateToken
} = require(
  '../middleware/auth.middleware'
);

const router = express.Router();

/*
 * All routes declared after this middleware
 * require a valid JWT token.
 *
 * Expected request header:
 *
 * Authorization: Bearer YOUR_JWT_TOKEN
 */
router.use(authenticateToken);

/*
 * Get the logged-in user's template.
 *
 * GET /api/db-template
 */
router.get(
  '/',
  getTemplate
);

/*
 * Update the logged-in user's template.
 *
 * PUT /api/db-template
 */
router.put(
  '/',
  saveTemplate
);

/*
 * Reset the logged-in user's template
 * to the default values.
 *
 * POST /api/db-template/reset
 */
router.post(
  '/reset',
  resetTemplate
);

module.exports = router;