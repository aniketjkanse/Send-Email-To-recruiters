const path = require('path');
const { readJson, writeJson } = require('../utils/file.util');
const { DATA_DIR } = require('../utils/path.util');

const SENDER_CONFIG_FILE = path.join(DATA_DIR, 'sender_config.json');

function readSenderConfig() {
  return readJson(SENDER_CONFIG_FILE, {
    emailProvider: 'gmail',
    emailUser: '',
    emailPass: '',
    emailUser2: '',
    emailPass2: ''
  });
}

function saveSenderConfig(config) {
  const existing = readSenderConfig();

  const updatedConfig = {
    emailProvider: config.emailProvider || 'gmail',
    emailUser: config.emailUser || '',
    emailPass: config.emailPass || existing.emailPass || '',
    emailUser2: config.emailUser2 || '',
    emailPass2:
      config.emailUser2
        ? (config.emailPass2 || existing.emailPass2 || '')
        : ''
  };

  writeJson(SENDER_CONFIG_FILE, updatedConfig);

  return {
    emailProvider: updatedConfig.emailProvider,
    emailUser: updatedConfig.emailUser,
    isPasswordSaved: Boolean(updatedConfig.emailPass),
    emailUser2: updatedConfig.emailUser2,
    isPassword2Saved: Boolean(updatedConfig.emailPass2)
  };
}

module.exports = {
  readSenderConfig,
  saveSenderConfig
};