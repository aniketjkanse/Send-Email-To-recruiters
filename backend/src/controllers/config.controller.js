const {
  readSenderConfig,
  saveSenderConfig
} = require('../services/senderConfig.service');

function getSenderConfig(req, res) {
  const config = readSenderConfig();

  return res.json({
    emailProvider: config.emailProvider,
    emailUser: config.emailUser,
    isPasswordSaved: Boolean(config.emailPass),
    emailUser2: config.emailUser2 || '',
    isPassword2Saved: Boolean(config.emailPass2)
  });
}

function updateSenderConfig(req, res) {
  const { emailProvider, emailUser, emailPass, emailUser2, emailPass2 } = req.body;
  const existing = readSenderConfig();

  if (!emailUser) {
    return res.status(400).json({
      message: 'Sender email is required'
    });
  }

  if (!emailPass && !existing.emailPass) {
    return res.status(400).json({
      message: 'App password is required'
    });
  }

  // The second account is fully optional, but if an address is given it needs a password too.
  if (emailUser2 && !emailPass2 && !existing.emailPass2) {
    return res.status(400).json({
      message: 'App password is required for the second sender account'
    });
  }

  const savedConfig = saveSenderConfig({
    emailProvider,
    emailUser,
    emailPass,
    emailUser2,
    emailPass2
  });

  return res.json({
    message: 'Sender configuration saved successfully',
    config: savedConfig
  });
}

module.exports = {
  getSenderConfig,
  updateSenderConfig
};