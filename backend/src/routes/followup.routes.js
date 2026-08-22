const express =
  require('express');

const {
  getFollowUpPage,
  checkReplies,
  saveTemplates,
  sendFollowUp1,
  sendFollowUp2,
  removeRecords,
  restoreRecord
} = require(
  '../controllers/followup.controller'
);

const router =
  express.Router();

router.get(
  '/',
  getFollowUpPage
);

router.post(
  '/check-replies',
  checkReplies
);

router.put(
  '/templates',
  saveTemplates
);

router.post(
  '/send-followup-1',
  sendFollowUp1
);

router.post(
  '/send-followup-2',
  sendFollowUp2
);

router.post(
  '/remove',
  removeRecords
);

router.post(
  '/:id/restore',
  restoreRecord
);

module.exports = router;