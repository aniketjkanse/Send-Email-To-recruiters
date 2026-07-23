const fs = require('fs');
const { EMAIL_TEMPLATE_FILE } = require('../utils/path.util');
const { readJson, writeJson } = require('../utils/file.util');

const defaultTemplate = {
  subject: 'Application for QA Automation Engineer Role',
  body: 'Hi,\n\nI came across your job post and wanted to share my profile for suitable QA / Automation Testing roles.\n\nI have experience in Selenium, Java, Cucumber BDD, API Automation, Rest Assured, TestNG, Git, Jenkins/Azure DevOps, and automation framework development.\n\nPlease find my resume attached for your reference.\n\nIf this is not relevant, please ignore this email.\n\nThanks,\nAniket Kanse',
  resumeFileName: 'Aniket_Kanse_Resume.pdf',
  dailyLimit: 100,
  minDelaySeconds: 180,
  maxDelaySeconds: 420,
  stopAfterContinuousFailures: 3,
  stopAfterTotalFailures: 8,
  skipPersonalEmails: true,
  dryRun: true,
  blockedDomains: ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'rediffmail.com', 'icloud.com', 'protonmail.com']
};
function readTemplate() { if (!fs.existsSync(EMAIL_TEMPLATE_FILE)) { writeJson(EMAIL_TEMPLATE_FILE, defaultTemplate); return defaultTemplate; } return { ...defaultTemplate, ...readJson(EMAIL_TEMPLATE_FILE, defaultTemplate) }; }
function saveTemplate(template) { const current = readTemplate(); const updated = { ...current, ...template, dailyLimit: Number(template.dailyLimit ?? current.dailyLimit), minDelaySeconds: Number(template.minDelaySeconds ?? current.minDelaySeconds), maxDelaySeconds: Number(template.maxDelaySeconds ?? current.maxDelaySeconds), stopAfterContinuousFailures: Number(template.stopAfterContinuousFailures ?? current.stopAfterContinuousFailures), stopAfterTotalFailures: Number(template.stopAfterTotalFailures ?? current.stopAfterTotalFailures), skipPersonalEmails: template.skipPersonalEmails === 'false' ? false : Boolean(template.skipPersonalEmails ?? current.skipPersonalEmails), dryRun: template.dryRun === 'false' ? false : Boolean(template.dryRun ?? current.dryRun) }; writeJson(EMAIL_TEMPLATE_FILE, updated); return updated; }
module.exports = { readTemplate, saveTemplate, defaultTemplate };
