const express =
  require('express');

const {
  sendFirstFollowUp,
  sendSecondFollowUp
} = require(
  '../controllers/followUpSend.controller'
);

const {
  authenticateToken
} = require(
  '../middleware/auth.middleware'
);

const router =
  express.Router();

/*
 * Every Follow-Up sending route requires
 * a valid JWT token.
 *
 * The authentication middleware provides:
 *
 * req.user.id
 * req.user.email
 */
router.use(
  authenticateToken
);

/*
 * Send Follow-Up 1.
 *
 * POST
 * /api/followup-send/:id/follow-up-1
 *
 * :id is the PostgreSQL FollowUpTracker ID.
 */
router.post(
  '/:id/follow-up-1',
  sendFirstFollowUp
);

/*
 * Send Follow-Up 2.
 *
 * POST
 * /api/followup-send/:id/follow-up-2
 *
 * :id is the PostgreSQL FollowUpTracker ID.
 */
router.post(
  '/:id/follow-up-2',
  sendSecondFollowUp
);

module.exports =
  router;