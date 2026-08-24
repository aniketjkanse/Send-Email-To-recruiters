const express =
  require('express');

const {
  startScheduler,
  getSchedulerStatus,
  stopScheduler,
  resetScheduler
} = require(
  '../controllers/send.controller'
);

const {
  authenticateToken
} = require(
  '../middleware/auth.middleware'
);

const router =
  express.Router();

/*
 * All scheduler routes require JWT.
 */
router.use(
  authenticateToken
);

/*
 * POST /api/send/start
 */
router.post(
  '/start',
  startScheduler
);

/*
 * GET /api/send/status
 */
router.get(
  '/status',
  getSchedulerStatus
);

/*
 * POST /api/send/stop
 */
router.post(
  '/stop',
  stopScheduler
);

/*
 * POST /api/send/reset
 */
router.post(
  '/reset',
  resetScheduler
);

module.exports =
  router;