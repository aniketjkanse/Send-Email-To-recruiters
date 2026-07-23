const {
  readSenderConfig,
  saveSenderConfig
} = require('../services/senderConfig.service');

function getSenderConfig(req, res) {
  const config = readSenderConfig();

  return res.json({
    emailProvider: config.emailProvider,
    emailUser: config.emailUser,
    isPasswordSaved: Boolean(config.emailPass)
  });
}

function updateSenderConfig(req, res) {
  const { emailProvider, emailUser, emailPass } = req.body;

  if (!emailUser || !emailPass) {
    return res.status(400).json({
      message: 'Sender email and app password are required'
    });
  }

  const savedConfig = saveSenderConfig({
    emailProvider,
    emailUser,
    emailPass
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