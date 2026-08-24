const express =
  require('express');

const {
  getAllHistory,
  getHistoryDetails,
  getSummary,
  removeHistoryRecord,
  removeAllHistory
} = require(
  '../controllers/history.controller'
);

const {
  authenticateToken
} = require(
  '../middleware/auth.middleware'
);

const router =
  express.Router();

router.use(
  authenticateToken
);

/*
 * GET /api/history
 */
router.get(
  '/',
  getAllHistory
);

/*
 * GET /api/history/summary
 */
router.get(
  '/summary',
  getSummary
);

/*
 * GET /api/history/:id
 */
router.get(
  '/:id',
  getHistoryDetails
);

/*
 * DELETE /api/history
 */
router.delete(
  '/',
  removeAllHistory
);

/*
 * DELETE /api/history/:id
 */
router.delete(
  '/:id',
  removeHistoryRecord
);

module.exports =
  router;