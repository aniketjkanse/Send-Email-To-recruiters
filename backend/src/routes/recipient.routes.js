const express =
  require('express');

const {
  getAllRecipients,
  replaceAllRecipients,
  addRecipients,
  removeRecipient,
  removeAllRecipients,
  getRecipientCount
} = require(
  '../controllers/recipient.controller'
);

const {
  authenticateToken
} = require(
  '../middleware/auth.middleware'
);

const router =
  express.Router();

/*
 * Every recipient route requires
 * a valid authenticated user.
 */
router.use(
  authenticateToken
);

/*
 * GET /api/recipients
 *
 * Get all active recipients belonging
 * to the logged-in user.
 */
router.get(
  '/',
  getAllRecipients
);

/*
 * GET /api/recipients/count
 */
router.get(
  '/count',
  getRecipientCount
);

/*
 * PUT /api/recipients
 *
 * Replace the logged-in user's complete
 * recipient list.
 */
router.put(
  '/',
  replaceAllRecipients
);

/*
 * POST /api/recipients
 *
 * Append emails without clearing the
 * user's existing recipient list.
 */
router.post(
  '/',
  addRecipients
);

/*
 * DELETE /api/recipients
 *
 * Remove every recipient belonging to
 * the logged-in user.
 */
router.delete(
  '/',
  removeAllRecipients
);

/*
 * DELETE /api/recipients/:id
 *
 * Remove one recipient belonging to
 * the logged-in user.
 */
router.delete(
  '/:id',
  removeRecipient
);

module.exports =
  router;