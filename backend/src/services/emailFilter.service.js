const { readTextLines, readJson } = require('../utils/file.util');
const { EXTRACTED_EMAILS_FILE, SENT_EMAILS_FILE } = require('../utils/path.util');
const DEFAULT_BLOCKED_DOMAINS = ['gmail.com','yahoo.com','hotmail.com','outlook.com','rediffmail.com','icloud.com','protonmail.com'];
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
function normalizeEmail(email) { return String(email || '').toLowerCase().trim(); }
function isValidEmail(email) { return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email); }
function getDomain(email) { return email.split('@')[1] || ''; }
function isBlockedDomain(email, blockedDomains = DEFAULT_BLOCKED_DOMAINS) { return blockedDomains.includes(getDomain(email)); }
/*
 * Uploaded files may be plain text (one email per line), CSV with
 * multiple columns, or CSV with quoted values. Instead of treating the
 * raw line as the email, pull the first email-shaped token out of it so
 * quotes, extra columns, and a header row (e.g. "email,domain") don't
 * get misclassified as invalid entries.
 */
function extractEmailFromLine(line) {
  const match = String(line || '').match(EMAIL_PATTERN);
  return match ? match[0] : '';
}
function readExtractedEmails() { return readTextLines(EXTRACTED_EMAILS_FILE).map(extractEmailFromLine).map(normalizeEmail).filter(Boolean); }
function readSentEmails() { return readJson(SENT_EMAILS_FILE, []).map(normalizeEmail); }
function buildEmailPreview(template = {}) {
  const extractedEmails = readExtractedEmails();
  const oldSentSet = new Set(readSentEmails());
  const uniqueInputEmails = [...new Set(extractedEmails)];
  const blockedDomains = template.blockedDomains || DEFAULT_BLOCKED_DOMAINS;
  const skipPersonalEmails = template.skipPersonalEmails !== false;
  const newEmails = [], alreadySentEmails = [], invalidEmails = [], blockedEmails = [];
  uniqueInputEmails.forEach(email => {
    if (!isValidEmail(email)) return invalidEmails.push(email);
    if (skipPersonalEmails && isBlockedDomain(email, blockedDomains)) return blockedEmails.push(email);
    if (oldSentSet.has(email)) return alreadySentEmails.push(email);
    newEmails.push(email);
  });
  return { totalInput: extractedEmails.length, uniqueInput: uniqueInputEmails.length, newEmails, alreadySentEmails, blockedEmails, invalidEmails };
}
module.exports = { DEFAULT_BLOCKED_DOMAINS, normalizeEmail, readExtractedEmails, readSentEmails, buildEmailPreview };
