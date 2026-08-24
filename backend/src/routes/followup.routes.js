const express =
  require('express');

const {
  getAllFollowUps,
  getFollowUpDetails,
  getSummary,
  completeFollowUp1,
  completeFollowUp2,
  saveDetectedReply,
  completeReplyCheck,
  saveFollowUpError,
  removeRecord,
  restoreRecord,
  stopRecord,
  resumeRecord,
  permanentlyDeleteRecord
} = require(
  '../controllers/followup.controller'
);

const {
  authenticateToken
} = require(
  '../middleware/auth.middleware'
);

const router =
  express.Router();

/*
 * All Follow-Up operations require a
 * valid logged-in user.
 */
router.use(
  authenticateToken
);

/*
 * GET /api/followups
 *
 * Optional query parameters:
 *
 * includeRemoved=true
 * includeStopped=true
 * status=INITIAL_SENT
 * replyDetected=true
 * limit=100
 */
router.get(
  '/',
  getAllFollowUps
);

/*
 * GET /api/followups/summary
 */
router.get(
  '/summary',
  getSummary
);

/*
 * GET /api/followups/:id
 */
router.get(
  '/:id',
  getFollowUpDetails
);

/*
 * POST /api/followups/:id/follow-up-1/sent
 */
router.post(
  '/:id/follow-up-1/sent',
  completeFollowUp1
);

/*
 * POST /api/followups/:id/follow-up-2/sent
 */
router.post(
  '/:id/follow-up-2/sent',
  completeFollowUp2
);

/*
 * POST /api/followups/:id/reply
 */
router.post(
  '/:id/reply',
  saveDetectedReply
);

/*
 * POST /api/followups/:id/reply-check
 */
router.post(
  '/:id/reply-check',
  completeReplyCheck
);

/*
 * POST /api/followups/:id/error
 */
router.post(
  '/:id/error',
  saveFollowUpError
);

/*
 * POST /api/followups/:id/remove
 */
router.post(
  '/:id/remove',
  removeRecord
);

/*
 * POST /api/followups/:id/restore
 */
router.post(
  '/:id/restore',
  restoreRecord
);

/*
 * POST /api/followups/:id/stop
 */
router.post(
  '/:id/stop',
  stopRecord
);

/*
 * POST /api/followups/:id/resume
 */
router.post(
  '/:id/resume',
  resumeRecord
);

/*
 * DELETE /api/followups/:id
 */
router.delete(
  '/:id',
  permanentlyDeleteRecord
);

module.exports =
  router;