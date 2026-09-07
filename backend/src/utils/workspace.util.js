const fs = require('fs');
const path = require('path');

const {
  DATA_DIR,
  EXTRACTED_EMAILS_FILE,
  SENT_EMAILS_FILE,
  FOLLOWUP_TRACKER_FILE,
  SEND_HISTORY_FILE
} = require('./path.util');

const { ensureDir } = require('./file.util');

/*
 * Each template is its own mailing workspace: its own email list, its
 * own sent log, its own follow-up tracker and its own send history.
 * Nothing is combined across templates. The Gmail sender account is
 * shared and is NOT part of the workspace.
 *
 * Files live under data/workspaces/<templateId>/<name>. The very first
 * time the "default" workspace needs a file, the matching legacy
 * top-level file (from before templates existed) is copied in so the
 * existing India mailing history is preserved.
 */

const LEGACY_FILE = {
  'extracted_emails.txt': EXTRACTED_EMAILS_FILE,
  'sent_emails.json': SENT_EMAILS_FILE,
  'followup_tracker.json': FOLLOWUP_TRACKER_FILE,
  'send_history.xlsx': SEND_HISTORY_FILE
};

function safeId(templateId) {
  return (
    String(templateId || 'default')
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'default'
  );
}

function currentTemplateId() {
  try {
    /*
     * Lazy require avoids a circular load with template.service.
     */
    const {
      readTemplate
    } = require('../services/template.service');

    return safeId(readTemplate().templateId);
  } catch (error) {
    return 'default';
  }
}

function workspaceFile(name, templateId) {
  const id = safeId(
    templateId || currentTemplateId()
  );

  const dir = path.join(
    DATA_DIR,
    'workspaces',
    id
  );

  ensureDir(dir);

  const scoped = path.join(dir, name);

  if (
    !fs.existsSync(scoped) &&
    id === 'default' &&
    LEGACY_FILE[name] &&
    fs.existsSync(LEGACY_FILE[name])
  ) {
    try {
      fs.copyFileSync(
        LEGACY_FILE[name],
        scoped
      );
    } catch (error) {
      console.log(
        `Unable to migrate legacy ${name}:`,
        error.message
      );
    }
  }

  return scoped;
}

module.exports = {
  workspaceFile,
  currentTemplateId
};
