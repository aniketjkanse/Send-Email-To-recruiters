const {
  getSenderAccount,
  saveSenderAccount,
  testSenderAccount,
  deleteSenderAccount
} = require(
  '../services/senderAccount.service'
);

async function getAccount(
  req,
  res
) {
  try {
    const senderAccount =
      await getSenderAccount(
        req.user.id
      );

    return res.json({
      source:
        'POSTGRESQL',

      senderAccount
    });
  } catch (error) {
    console.error(
      'Unable to load sender account:',
      error.message
    );

    return res
      .status(500)
      .json({
        message:
          error.message
      });
  }
}

async function saveAccount(
  req,
  res
) {
  try {
    const senderAccount =
      await saveSenderAccount(
        req.user.id,
        req.body || {}
      );

    return res.json({
      message:
        'Sender account saved securely.',

      source:
        'POSTGRESQL',

      senderAccount
    });
  } catch (error) {
    console.error(
      'Unable to save sender account:',
      error.message
    );

    return res
      .status(400)
      .json({
        message:
          error.message
      });
  }
}

async function testAccount(
  req,
  res
) {
  try {
    const result =
      await testSenderAccount(
        req.user.id
      );

    return res.json(
      result
    );
  } catch (error) {
    console.error(
      'Sender account verification failed:',
      error.message
    );

    return res
      .status(400)
      .json({
        success: false,

        message:
          error.message
      });
  }
}

async function removeAccount(
  req,
  res
) {
  try {
    const result =
      await deleteSenderAccount(
        req.user.id
      );

    return res.json(
      result
    );
  } catch (error) {
    console.error(
      'Unable to remove sender account:',
      error.message
    );

    return res
      .status(400)
      .json({
        message:
          error.message
      });
  }
}

module.exports = {
  getAccount,
  saveAccount,
  testAccount,
  removeAccount
};