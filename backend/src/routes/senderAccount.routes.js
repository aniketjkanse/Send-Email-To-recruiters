const express =
  require('express');

const {
  getAccount,
  saveAccount,
  testAccount,
  removeAccount
} = require(
  '../controllers/senderAccount.controller'
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

router.get(
  '/',
  getAccount
);

router.put(
  '/',
  saveAccount
);

router.post(
  '/test',
  testAccount
);

router.delete(
  '/',
  removeAccount
);

module.exports =
  router;