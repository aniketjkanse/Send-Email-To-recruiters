const express =
  require('express');

const {
  getEligibility,
  startFollowUp1Batch,
  startFollowUp2Batch,
  getBatchStatus,
  stopBatch,
  resetBatch
} = require(
  '../controllers/followUpBatch.controller'
);

const {
  authenticateToken
} = require(
  '../middleware/auth.middleware'
);

const router =
  express.Router();

/*
 * Every Follow-Up batch route requires
 * a valid JWT token.
 *
 * authenticateToken provides:
 *
 * req.user.id
 * req.user.email
 */
router.use(
  authenticateToken
);

/*
 * Get immediate Follow-Up eligibility
 * and remaining daily capacity.
 *
 * GET
 * /api/followup-send/eligibility
 */
router.get(
  '/eligibility',
  getEligibility
);

/*
 * Start Follow-Up 1 batch.
 *
 * POST
 * /api/followup-send/batch/follow-up-1
 */
router.post(
  '/batch/follow-up-1',
  startFollowUp1Batch
);

/*
 * Start Follow-Up 2 batch.
 *
 * POST
 * /api/followup-send/batch/follow-up-2
 */
router.post(
  '/batch/follow-up-2',
  startFollowUp2Batch
);

/*
 * Get the logged-in user's current
 * Follow-Up batch status.
 *
 * GET
 * /api/followup-send/batch/status
 */
router.get(
  '/batch/status',
  getBatchStatus
);

/*
 * Request a safe stop.
 *
 * POST
 * /api/followup-send/batch/stop
 */
router.post(
  '/batch/stop',
  stopBatch
);

/*
 * Reset completed, stopped, or failed
 * Follow-Up batch state.
 *
 * POST
 * /api/followup-send/batch/reset
 */
router.post(
  '/batch/reset',
  resetBatch
);

module.exports =
  router;