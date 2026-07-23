const path = require('path');
const { readJson, writeJson } = require('../utils/file.util');
const { DATA_DIR } = require('../utils/path.util');

const SENDER_CONFIG_FILE = path.join(DATA_DIR, 'sender_config.json');

function readSenderConfig() {
  return readJson(SENDER_CONFIG_FILE, {
    emailProvider: 'gmail',
    emailUser: '',
    emailPass: ''
  });
}

function saveSenderConfig(config) {
  const updatedConfig = {
    emailProvider: config.emailProvider || 'gmail',
    emailUser: config.emailUser || '',
    emailPass: config.emailPass || ''
  };

  writeJson(SENDER_CONFIG_FILE, updatedConfig);

  return {
    emailProvider: updatedConfig.emailProvider,
    emailUser: updatedConfig.emailUser,
    isPasswordSaved: Boolean(updatedConfig.emailPass)
  };
}

module.exports = {
  readSenderConfig,
  saveSenderConfig
};