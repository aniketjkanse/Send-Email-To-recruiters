const express =
  require('express');

const {
  testImapConnection,
  refreshAllReplies,
  refreshSingleReply
} = require(
  '../controllers/replyDetection.controller'
);

const {
  authenticateToken
} = require(
  '../middleware/auth.middleware'
);

const router =
  express.Router();

/*
 * All Gmail reply-detection routes require
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
 * Test Gmail IMAP connectivity.
 *
 * POST /api/followups/test-imap
 */
router.post(
  '/test-imap',
  testImapConnection
);

/*
 * Check all eligible PostgreSQL
 * FollowUpTracker records for replies.
 *
 * POST /api/followups/refresh-replies
 */
router.post(
  '/refresh-replies',
  refreshAllReplies
);

/*
 * Check one PostgreSQL FollowUpTracker
 * record for a Gmail reply.
 *
 * POST /api/followups/:id/check-reply
 */
router.post(
  '/:id/check-reply',
  refreshSingleReply
);

module.exports =
  router;